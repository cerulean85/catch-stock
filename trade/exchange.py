"""매월 21일 미국주식 수익의 20%를 환전하는 스크립트.

주요 동작:
1. 실행일 검사: 매월 21일 09:30 기준 (21일이 주말/공휴일이면 직전 영업일).
   - 오늘이 환전일이 아니면 건너뜁니다 (--force 로 강제 실행 가능).
2. 직전 환전일 다음날부터 오늘까지의 미국주식 실현손익(ust21530)을 조회합니다.
3. 실현손익이 0 이하(손실 또는 0)이면 환전을 건너뜁니다.
4. 실현손익의 20%를 계산하고, 현재 외화환전가능금액(ust31300)을 조회해
   가능 금액 한도 내에서 환전 금액(USD)을 확정합니다.
5. 키움 환전 신청(ust31302)을 실행해 USD -> KRW로 원화 환전합니다.
   (--dry-run 이 기본값이거나 플래그로 지정 시 모의 계산만 수행하며 실제 환전은 발생하지 않습니다.)
6. 환전된 원화는 주거래 은행의 오픈뱅킹(자동 모으기/가져오기) 또는
   키움증권 약정계좌 자동이체에 의해 내 은행 계좌로 자동 입금됩니다.

실행 예시:
    python exchange.py --dry-run           # 안전 모의 실행 (기본)
    python exchange.py --execute           # 실제 환전 실행 (주의)
    python exchange.py --force --dry-run   # 날짜 검사 건너뛰고 모의 테스트
"""

import argparse
import os
import sys
import uuid
from datetime import date, datetime, timedelta

import psycopg
from dotenv import load_dotenv

from kakao import send_exchange_notification
from kiwoom import KiwoomClient, KiwoomError
from parse import (
	api_error_message,
	parse_exchange_estimate,
	parse_exchange_result,
	parse_realized_profit,
	to_number,
)
from schedule_helper import (
	get_exchange_target_date,
	get_previous_target_date,
	is_exchange_day,
)

# 환경 변수 로드 (trade/.env 우선)
load_dotenv()

DEFAULT_RATE_PCT = 20.0  # 수익의 20%
MIN_EXCHANGE_USD = 1.0   # 최소 환전 금액 (1달러)


def log(message):
	stamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
	print(f'[{stamp}] {message}', flush=True)


def record_history(db_url, data):
	"""Postgres에 환전 실행/스킵 이력을 기록합니다 (실패해도 프로세스를 중단하지 않음)."""
	if not db_url:
		return
	try:
		with psycopg.connect(db_url) as conn:
			with conn.cursor() as cur:
				cur.execute("""
					CREATE TABLE IF NOT EXISTS "accountExchange" (
						"id" text PRIMARY KEY,
						"executedAt" timestamp with time zone NOT NULL DEFAULT now(),
						"periodStart" text NOT NULL,
						"periodEnd" text NOT NULL,
						"realizedProfitUsd" numeric NOT NULL DEFAULT 0,
						"targetUsd" numeric NOT NULL DEFAULT 0,
						"availableUsd" numeric NOT NULL DEFAULT 0,
						"exchangedUsd" numeric NOT NULL DEFAULT 0,
						"exchangeRate" numeric NOT NULL DEFAULT 0,
						"receivedKrw" numeric NOT NULL DEFAULT 0,
						"status" text NOT NULL,
						"message" text
					)
				""")
				cur.execute("""
					INSERT INTO "accountExchange"
					("id", "periodStart", "periodEnd", "realizedProfitUsd", "targetUsd",
					 "availableUsd", "exchangedUsd", "exchangeRate", "receivedKrw", "status", "message")
					VALUES (%(id)s, %(period_start)s, %(period_end)s, %(profit_usd)s, %(target_usd)s,
					        %(available_usd)s, %(exchanged_usd)s, %(exchange_rate)s, %(received_krw)s, %(status)s, %(message)s)
				""", data)
				conn.commit()
	except Exception as e:
		log(f'DB 이력 저장 실패 (무시됨): {e}')


def run_exchange(
	client,
	ref_date=None,
	force=False,
	dry_run=True,
	rate_pct=DEFAULT_RATE_PCT,
	amount=None,
	period_start=None,
	period_end=None,
	db_url=None,
	yes=False,
	notify_kakao=False,
):
	"""환전 파이프라인의 핵심 로직."""
	today = ref_date or date.today()
	target_date = get_exchange_target_date(today.year, today.month)

	# 1. 날짜 확인 (매월 21일 또는 직전 영업일)
	if not force and today != target_date:
		log(f'오늘은 이번 달 환전 실행일이 아닙니다. (오늘: {today}, 이번달 환전예정일: {target_date})')
		log('종료합니다. (--force 로 날짜 검사를 건너뛸 수 있습니다.)')
		return {'status': 'skipped_not_target_date', 'target_date': str(target_date)}

	log(f'=== [환전 파이프라인 시작] 기준일: {today} (이번달 환전영업일: {target_date}) ===')

	# 2. 조회 기간 산출 (직전 환전일 다음날 ~ 오늘)
	if not period_start:
		prev_target = get_previous_target_date(today.year, today.month)
		period_start_date = prev_target + timedelta(days=1)
	else:
		period_start_date = datetime.strptime(period_start, '%Y-%m-%d').date()

	if not period_end:
		period_end_date = today
	else:
		period_end_date = datetime.strptime(period_end, '%Y-%m-%d').date()

	start_str = period_start_date.strftime('%Y%m%d')
	end_str = period_end_date.strftime('%Y%m%d')
	log(f'미국주식 실현손익 조회 기간: {period_start_date} ~ {period_end_date} ({start_str}~{end_str})')

	# 3. 미국주식 실현손익 조회 (ust21530)
	try:
		profit_body = client.fetch_overseas_profit(start_str, end_str)
	except KiwoomError as e:
		log(f'[오류] 실현손익 조회 실패: {e}')
		return {'status': 'error', 'message': str(e)}

	err = api_error_message(profit_body)
	if err:
		log(f'[오류] 실현손익 API 응답 오류: {err}')
		return {'status': 'error', 'message': err}

	profit_data = parse_realized_profit(profit_body)
	profit_usd = profit_data['profit_usd']
	log(f'미국주식 기간 실현손익: ${profit_usd:,.2f} USD '
	    f'(총매도: ${profit_data["total_sell_usd"]:,.2f}, '
	    f'총매수: ${profit_data["total_buy_usd"]:,.2f}, '
	    f'제비용: ${profit_data["total_fee_tax_usd"]:,.2f})')

	# 4. 환전 목표 금액 결정 (사용자 직접 지정 --amount vs 실현손익 20% 자동 계산)
	if amount is not None:
		if amount <= 0:
			log(f'[오류] 지정된 환전 금액(${amount:.2f} USD)은 0보다 커야 합니다.')
			return {'status': 'error', 'message': 'amount must be positive'}
		target_usd = round(amount, 2)
		log(f'사용자 직접 지정 환전 금액: ${target_usd:,.2f} USD (손익 20% 계산 대신 지정 금액 적용)')
	else:
		# 실현 손익 검증 (0 이하이면 건너뜀)
		if profit_usd <= 0:
			msg = f'실현손익이 0 USD 이하(${profit_usd:,.2f} USD)이므로 환전을 건너뜁니다.'
			log(f'[건너뜀] {msg}')
			record_history(db_url, {
				'id': str(uuid.uuid4()),
				'period_start': str(period_start_date),
				'period_end': str(period_end_date),
				'profit_usd': profit_usd,
				'target_usd': 0,
				'available_usd': 0,
				'exchanged_usd': 0,
				'exchange_rate': 0,
				'received_krw': 0,
				'status': 'skipped_no_profit',
				'message': msg,
			})
			return {'status': 'skipped_no_profit', 'profit_usd': profit_usd}

		target_usd = round(profit_usd * (rate_pct / 100.0), 2)
		log(f'환전 목표 금액 ({rate_pct}%): ${target_usd:,.2f} USD')

	# 5. 외화환전가능금액 및 적용 환율 조회 (ust31300)
	try:
		estimate_body = client.fetch_exchange_estimate(exch_tp='2', fc_exmn_amt='')
	except KiwoomError as e:
		log(f'[오류] 환전 가능 금액 조회 실패: {e}')
		return {'status': 'error', 'message': str(e)}

	err = api_error_message(estimate_body)
	if err:
		log(f'[오류] 환전 가능 금액 API 응답 오류: {err}')
		return {'status': 'error', 'message': err}

	estimate_data = parse_exchange_estimate(estimate_body, exch_tp='2')
	available_usd = estimate_data['available_usd']
	exchange_rate = estimate_data['exchange_rate']
	log(f'현재 외화환전가능금액: ${available_usd:,.2f} USD (적용 예상 환율: {exchange_rate:,.2f} KRW/USD)')

	# 외화 잔고 부족 체크
	if available_usd <= 0:
		msg = f'외화환전가능금액이 0 USD 이하(${available_usd:,.2f} USD)이므로 환전할 수 없습니다.'
		log(f'[건너뜀] {msg}')
		record_history(db_url, {
			'id': str(uuid.uuid4()),
			'period_start': str(period_start_date),
			'period_end': str(period_end_date),
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'available_usd': available_usd,
			'exchanged_usd': 0,
			'exchange_rate': exchange_rate,
			'received_krw': 0,
			'status': 'skipped_no_funds',
			'message': msg,
		})
		return {'status': 'skipped_no_funds', 'available_usd': available_usd}

	# 최종 환전 대상 금액 결정 (목표치와 가능 금액 중 작은 값)
	final_usd = min(target_usd, available_usd)
	final_usd = round(final_usd, 2)

	if final_usd < MIN_EXCHANGE_USD:
		msg = f'환전 대상 금액(${final_usd:,.2f} USD)이 최소 기준(${MIN_EXCHANGE_USD:,.2f} USD) 미만입니다.'
		log(f'[건너뜀] {msg}')
		record_history(db_url, {
			'id': str(uuid.uuid4()),
			'period_start': str(period_start_date),
			'period_end': str(period_end_date),
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'available_usd': available_usd,
			'exchanged_usd': 0,
			'exchange_rate': exchange_rate,
			'received_krw': 0,
			'status': 'skipped_below_minimum',
			'message': msg,
		})
		return {'status': 'skipped_below_minimum', 'final_usd': final_usd}

	if final_usd < target_usd:
		log(f'[주의] 외화환전가능금액(${available_usd:,.2f} USD)이 목표치(${target_usd:,.2f} USD)보다 적어 가능 금액 한도 내에서 환전합니다.')

	expected_krw = round(final_usd * exchange_rate) if exchange_rate else 0
	log(f'최종 환전 결정: ${final_usd:,.2f} USD -> 예상 입금 원화: ₩{expected_krw:,} KRW')

	# 6. 환전 신청 실행 (ust31302)
	if dry_run:
		log('--------------------------------------------------')
		log('[DRY-RUN] 모의 실행 모드입니다. 실제 환전 API(ust31302)를 호출하지 않았습니다.')
		log(f'▶ 환전 예정 금액: ${final_usd:,.2f} USD')
		log(f'▶ 예상 입금 원화: ₩{expected_krw:,} KRW (적용환율: {exchange_rate:,.2f})')
		log('▶ 실제 실행 시에는 "--execute" 플래그를 사용하세요.')
		log('▶ 환전된 원화는 주거래 은행의 오픈뱅킹(자동 모으기/가져오기)을 통해 내 계좌로 자동 입금됩니다.')
		log('--------------------------------------------------')
		record_history(db_url, {
			'id': str(uuid.uuid4()),
			'period_start': str(period_start_date),
			'period_end': str(period_end_date),
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'available_usd': available_usd,
			'exchanged_usd': final_usd,
			'exchange_rate': exchange_rate,
			'received_krw': expected_krw,
			'status': 'dry_run_success',
			'message': '모의 실행 완료',
		})
		if notify_kakao:
			ok, kakao_msg = send_exchange_notification(
				sold_usd=final_usd,
				received_krw=expected_krw,
				exchange_rate=exchange_rate,
				exchange_date=target_date,
			)
			if ok:
				log(f'▶ [카카오톡 모의 알림] 전송 완료: {kakao_msg}')
			else:
				log(f'▶ [카카오톡 모의 알림] {kakao_msg}')

		return {
			'status': 'dry_run_success',
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'final_usd': final_usd,
			'expected_krw': expected_krw,
		}

	# 터미널 대화형 실행 시 최종 확인 프롬프트 (안전장치)
	if sys.stdin.isatty() and not yes:
		try:
			confirm = input(f'\n⚠️  [최종 확인] 키움증권 계좌의 ${final_usd:,.2f} USD를 원화(약 ₩{expected_krw:,}원)로 즉시 환전하시겠습니까? [y/N]: ')
		except (KeyboardInterrupt, EOFError):
			confirm = 'n'
		if confirm.strip().lower() not in ('y', 'yes'):
			log('[취소] 사용자가 환전 실행을 취소했습니다.')
			return {'status': 'cancelled', 'message': 'User cancelled'}

	# 실제 환전 신청 호출
	log(f'[실행] 키움 환전 신청(ust31302)을 호출합니다... (${final_usd:.2f} USD)')
	try:
		res = client.request_exchange(exch_tp='2', fc_exmn_amt=f'{final_usd:.2f}')
		exchange_body = res[0] if isinstance(res, (tuple, list)) else res
	except KiwoomError as e:
		log(f'[오류] 환전 신청 API 실패: {e}')
		record_history(db_url, {
			'id': str(uuid.uuid4()),
			'period_start': str(period_start_date),
			'period_end': str(period_end_date),
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'available_usd': available_usd,
			'exchanged_usd': final_usd,
			'exchange_rate': exchange_rate,
			'received_krw': 0,
			'status': 'failed',
			'message': str(e),
		})
		return {'status': 'error', 'message': str(e)}

	err = api_error_message(exchange_body)
	if err:
		log(f'[오류] 환전 신청 거부: {err}')
		record_history(db_url, {
			'id': str(uuid.uuid4()),
			'period_start': str(period_start_date),
			'period_end': str(period_end_date),
			'profit_usd': profit_usd,
			'target_usd': target_usd,
			'available_usd': available_usd,
			'exchanged_usd': final_usd,
			'exchange_rate': exchange_rate,
			'received_krw': 0,
			'status': 'failed',
			'message': err,
		})
		return {'status': 'error', 'message': err}

	result = parse_exchange_result(exchange_body)
	log('==================================================')
	log('🎉 환전 처리가 정상 완료되었습니다!')
	log(f'▶ 매도 달러: ${result["sold_usd"]:,.2f} USD')
	log(f'▶ 입금 원화: ₩{result["received_krw"]:,.0f} KRW')
	log(f'▶ 적용 환율: {result["exchange_rate"]:,.2f} KRW/USD')
	log(f'▶ 메시지: {result["return_msg"]}')
	log('▶ 내 은행 계좌로의 송금: 주거래 은행 오픈뱅킹 자동이체(21일 오후)에 의해 계좌로 이체됩니다.')
	log('==================================================')

	record_history(db_url, {
		'id': str(uuid.uuid4()),
		'period_start': str(period_start_date),
		'period_end': str(period_end_date),
		'profit_usd': profit_usd,
		'target_usd': target_usd,
		'available_usd': available_usd,
		'exchanged_usd': result['sold_usd'] or final_usd,
		'exchange_rate': result['exchange_rate'] or exchange_rate,
		'received_krw': result['received_krw'] or expected_krw,
		'status': 'completed',
		'message': result['return_msg'],
	})

	# 카카오톡 알림 전송 (환전 결과 및 영웅문S# 바로가기 링크)
	sold_usd_final = result['sold_usd'] or final_usd
	received_krw_final = result['received_krw'] or expected_krw
	rate_final = result['exchange_rate'] or exchange_rate
	ok, kakao_msg = send_exchange_notification(
		sold_usd=sold_usd_final,
		received_krw=received_krw_final,
		exchange_rate=rate_final,
		exchange_date=target_date,
	)
	if ok:
		log(f'▶ [카카오톡 알림] 전송 완료: {kakao_msg}')
	else:
		log(f'▶ [카카오톡 알림] {kakao_msg}')

	return {
		'status': 'completed',
		'sold_usd': result['sold_usd'] or final_usd,
		'received_krw': result['received_krw'] or expected_krw,
		'exchange_rate': result['exchange_rate'] or exchange_rate,
	}


def check_account_status(
	client,
	ref_date=None,
	period_start=None,
	period_end=None,
	rate_pct=DEFAULT_RATE_PCT,
):
	"""실제 계좌의 미국주식 실현손익, 잔고(외화예수금/환전가능금액), 보유 평가액만 조회합니다 (환전 실행 없음)."""
	today = ref_date or date.today()
	target_date = get_exchange_target_date(today.year, today.month)

	if not period_start:
		prev_target = get_previous_target_date(today.year, today.month)
		period_start_date = prev_target + timedelta(days=1)
	else:
		period_start_date = datetime.strptime(period_start, '%Y-%m-%d').date()

	if not period_end:
		period_end_date = today
	else:
		period_end_date = datetime.strptime(period_end, '%Y-%m-%d').date()

	start_str = period_start_date.strftime('%Y%m%d')
	end_str = period_end_date.strftime('%Y%m%d')

	log(f'계좌 현황 조회 시작... (실현손익 집계기간: {period_start_date} ~ {period_end_date})')

	# 1. 미국주식 기간 실현손익 조회 (ust21530)
	try:
		profit_body = client.fetch_overseas_profit(start_str, end_str)
	except KiwoomError as e:
		log(f'[오류] 실현손익 조회 실패: {e}')
		return False

	err = api_error_message(profit_body)
	if err:
		log(f'[오류] 실현손익 API 응답 오류: {err}')
		return False

	profit_data = parse_realized_profit(profit_body)
	profit_usd = profit_data['profit_usd']

	# 2. 외화환전가능금액 및 환율 조회 (ust31300)
	try:
		estimate_body = client.fetch_exchange_estimate(exch_tp='2', fc_exmn_amt='')
	except KiwoomError as e:
		log(f'[오류] 환전 가능 금액 조회 실패: {e}')
		return False

	err = api_error_message(estimate_body)
	if err:
		log(f'[오류] 환전 가능 금액 API 응답 오류: {err}')
		return False

	estimate_data = parse_exchange_estimate(estimate_body, exch_tp='2')
	available_usd = estimate_data['available_usd']
	exchange_rate = estimate_data['exchange_rate']

	# 3. 미국주식 보유 잔고 및 총평가액 조회 (ust21070)
	tot_evlt_usd = 0.0
	tot_pnl_usd = 0.0
	tot_pnl_rt = 0.0
	try:
		holdings_body = client.fetch_overseas()
		tot_evlt_usd = to_number(holdings_body.get('tot_evlt_amt'))
		tot_pnl_usd = to_number(holdings_body.get('tot_pl_amt'))
		tot_pnl_rt = to_number(holdings_body.get('tot_pl_rt'))
	except Exception:
		pass

	# 4. 20% 환전 시뮬레이션 계산
	target_usd = round(profit_usd * (rate_pct / 100.0), 2) if profit_usd > 0 else 0.0
	final_usd = min(target_usd, available_usd) if profit_usd > 0 else 0.0
	expected_krw = round(final_usd * exchange_rate) if exchange_rate else 0

	print('\n' + '=' * 62)
	print('📊 [키움 계좌] 미국주식 실현손익 및 잔고 현황 (조회 전용)')
	print('=' * 62)
	print(f'• 기준일자: {today} (이번 달 환전 영업일: {target_date})')
	print(f'• 실현손익 집계기간: {period_start_date} ~ {period_end_date}')
	print('-' * 62)
	print('[1. 미국주식 기간 실현손익]')
	profit_sign = '+' if profit_usd > 0 else ''
	print(f'  - 총 실현손익: {profit_sign}${profit_usd:,.2f} USD')
	print(f'  - 총 매도금액: ${profit_data["total_sell_usd"]:,.2f} USD')
	print(f'  - 총 매수금액: ${profit_data["total_buy_usd"]:,.2f} USD')
	print(f'  - 제비용/세금: ${profit_data["total_fee_tax_usd"]:,.2f} USD')
	print('-' * 62)
	print('[2. 계좌 잔고 및 환율]')
	print(f'  - 외화환전가능금액: ${available_usd:,.2f} USD')
	print(f'  - 현재 적용 예상환율: {exchange_rate:,.2f} KRW/USD')
	if tot_evlt_usd > 0 or tot_pnl_usd != 0:
		pnl_sign = '+' if tot_pnl_usd > 0 else ''
		print(f'  - 보유주식 총평가액: ${tot_evlt_usd:,.2f} USD (평가손익: {pnl_sign}${tot_pnl_usd:,.2f} USD, {tot_pnl_rt:+.2f}%)')
	print('-' * 62)
	print(f'[3. {rate_pct:.0f}% 환전 시뮬레이션]')
	if profit_usd <= 0:
		print('  - 상태: 기간 실현손익이 0 이하이므로 환전 대상 없음 (건너뜀 대상)')
	else:
		print(f'  - {rate_pct:.0f}% 목표 환전액: ${target_usd:,.2f} USD')
		if available_usd < target_usd:
			print(f'  - 실제 환전 가능액: ${final_usd:,.2f} USD (외화 예수금 부족으로 한도 제한)')
		else:
			print(f'  - 실제 환전 가능액: ${final_usd:,.2f} USD (전액 환전 가능)')
		print(f'  - 예상 원화 입금액: ₩{expected_krw:,} KRW')
		print('  - 송금 연계 안내: 21일 오후 은행 오픈뱅킹 자동이체로 내 계좌로 출금')
	print('=' * 62 + '\n')
	return True


class MockKiwoomClient:
	"""로컬 환경(IP 미등록 환경)에서 키움 API 호출 없이 파이프라인 전체를 테스트하기 위한 모의 클라이언트."""

	def __init__(self, sim_profit=1000.0, sim_available=500.0, sim_rate=1380.0):
		self.sim_profit = sim_profit
		self.sim_available = sim_available
		self.sim_rate = sim_rate

	def fetch_overseas_profit(self, start_dt, end_dt):
		return {
			'return_code': 0,
			'tot_pl_amt': f'{self.sim_profit:.2f}',
			'tot_sell_amt': f'{self.sim_profit * 2:.2f}',
			'tot_buy_amt': f'{self.sim_profit:.2f}',
			'tot_cmsn_tax': '0.00',
		}

	def fetch_exchange_estimate(self, exch_tp='2', fc_exmn_amt=''):
		return {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': f'{self.sim_available:.2f}',
			'aplc_exrt': f'{self.sim_rate:.2f}',
			'buy_expc_amt': f'{self.sim_available * self.sim_rate:.0f}',
		}

	def fetch_overseas(self):
		return {
			'return_code': 0,
			'tot_evlt_amt': '12500.00',
			'tot_pl_amt': '850.00',
			'tot_pl_rt': '7.29',
			'result_list': [],
		}

	def request_exchange(self, exch_tp='2', fc_exmn_amt='0'):
		return {
			'return_code': 0,
			'return_msg': '환전처리가 완료되었습니다.',
			'sell_fc_amt': fc_exmn_amt,
			'krw_exmn_amt': f'{float(fc_exmn_amt) * self.sim_rate:.0f}',
			'aplc_exrt': f'{self.sim_rate:.2f}',
		}


def main():
	parser = argparse.ArgumentParser(description='매월 21일 미국주식 수익 20% 자동 환전기')
	parser.add_argument('--check', action='store_true', help='환전 실행 없이 계좌의 미국장 실현손익 및 잔고 현황만 조회')
	parser.add_argument('--dry-run', action='store_true', default=True, help='실제 환전을 실행하지 않고 모의 계산만 수행 (기본값: True)')
	parser.add_argument('--execute', action='store_true', help='실제 환전 API(ust31302)를 호출하여 환전을 실행')
	parser.add_argument('--force', action='store_true', help='오늘이 21일(직전영업일)인지 체크를 건너뛰고 강제 실행')
	parser.add_argument('--date', type=str, default=None, help='기준일 시뮬레이션 (YYYY-MM-DD)')
	parser.add_argument('--period-start', type=str, default=None, help='실현손익 시작일 (YYYY-MM-DD)')
	parser.add_argument('--period-end', type=str, default=None, help='실현손익 종료일 (YYYY-MM-DD)')
	parser.add_argument('--rate-pct', type=float, default=DEFAULT_RATE_PCT, help='환전할 수익 비율(%%, 기본 20)')
	parser.add_argument('--amount', '--usd', type=float, default=None, help='직접 환전할 달러 금액(USD). 지정 시 손익 20% 계산 대신 이 금액으로 환전 시도')
	parser.add_argument('-y', '--yes', action='store_true', help='대화형 확인 프롬프트 생략 (스크립트/자동화용)')
	parser.add_argument('--simulate', action='store_true', help='IP 미등록 로컬 환경 등에서 가상 데이터로 전체 파이프라인 검증')
	parser.add_argument('--sim-profit', type=float, default=1000.0, help='시뮬레이션용 미국주식 실현손익 USD (기본 1000.0)')
	parser.add_argument('--sim-available', type=float, default=500.0, help='시뮬레이션용 외화환전가능금액 USD (기본 500.0)')
	parser.add_argument('--test-kakao', action='store_true', help='카카오톡 환전 완료 알림 메시지 발송 테스트')
	parser.add_argument('--notify-kakao', action='store_true', help='모의 실행(dry-run/simulate) 시에도 카카오톡 알림 전송')

	args = parser.parse_args()

	# --test-kakao 플래그인 경우: 카카오톡 알림 테스트만 수행하고 종료
	if args.test_kakao:
		log('[카카오톡] 알림 메시지 발송 테스트를 시작합니다...')
		test_usd = args.amount or 100.0
		test_rate = 1450.0
		test_krw = test_usd * test_rate
		ok, msg = send_exchange_notification(
			sold_usd=test_usd,
			received_krw=test_krw,
			exchange_rate=test_rate,
		)
		if ok:
			log(f'🎉 카카오톡 테스트 알림 전송 성공: {msg}')
			sys.exit(0)
		else:
			log(f'❌ 카카오톡 테스트 알림 실패: {msg}')
			sys.exit(1)

	ref_date = datetime.strptime(args.date, '%Y-%m-%d').date() if args.date else None
	db_url = os.environ.get('DATABASE_URL')

	if args.simulate:
		log('[안내] --simulate 모드로 실행합니다. (키움 API 접속 없이 가상 데이터 사용)')
		client = MockKiwoomClient(sim_profit=args.sim_profit, sim_available=args.sim_available)
	else:
		try:
			client = KiwoomClient()
		except KiwoomError as e:
			log(f'키움 클라이언트 초기화 실패: {e}')
			sys.exit(1)

	# --check 플래그인 경우: 단순 현황 조회만 수행하고 종료
	if args.check:
		success = check_account_status(
			client=client,
			ref_date=ref_date,
			period_start=args.period_start,
			period_end=args.period_end,
			rate_pct=args.rate_pct,
		)
		sys.exit(0 if success else 1)

	# --execute 플래그가 명시되어야 실제 환전이 수행됨 (안전 장치)
	dry_run_mode = not args.execute

	result = run_exchange(
		client=client,
		ref_date=ref_date,
		force=args.force,
		dry_run=dry_run_mode,
		rate_pct=args.rate_pct,
		amount=args.amount,
		period_start=args.period_start,
		period_end=args.period_end,
		db_url=db_url,
		yes=args.yes,
		notify_kakao=args.notify_kakao,
	)

	if result.get('status') == 'error':
		sys.exit(1)
	sys.exit(0)


if __name__ == '__main__':
	main()
