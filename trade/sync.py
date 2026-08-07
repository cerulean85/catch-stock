"""키움 잔고를 주기적으로 조회해 DB에 적재한다.

웹(Next.js)은 이 테이블만 읽는다. 키움 API는 호출 IP 등록이 필요하므로
고정 IP를 가진 이 서버에서만 호출한다.

    python sync.py --once      # 1회 조회 후 종료 (cron용)
    python sync.py             # SYNC_INTERVAL_SEC 주기로 반복
"""

import argparse
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import psycopg

from kiwoom import KiwoomClient, KiwoomError, fetch_public_ip
from parse import (
	SCOPE_DOMESTIC,
	SCOPE_OVERSEAS,
	SIDE_BUY,
	SIDE_SELL,
	api_error_message,
	parse_domestic,
	parse_domestic_trades,
	parse_overseas,
	parse_overseas_trades,
)

SYNC_ID = 'kiwoom'
DEFAULT_INTERVAL_SEC = 300

UPSERT_HOLDING = """
INSERT INTO "accountHolding"
    ("scope", "code", "name", "quantity", "avgPrice", "currentPrice",
     "evalAmount", "pnlAmount", "pnlRate", "currency", "evalAmountKrw", "updatedAt")
VALUES (%(scope)s, %(code)s, %(name)s, %(quantity)s, %(avg_price)s, %(current_price)s,
        %(eval_amount)s, %(pnl_amount)s, %(pnl_rate)s, %(currency)s, %(eval_amount_krw)s, %(now)s)
ON CONFLICT ("scope", "code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "quantity" = EXCLUDED."quantity",
    "avgPrice" = EXCLUDED."avgPrice",
    "currentPrice" = EXCLUDED."currentPrice",
    "evalAmount" = EXCLUDED."evalAmount",
    "pnlAmount" = EXCLUDED."pnlAmount",
    "pnlRate" = EXCLUDED."pnlRate",
    "currency" = EXCLUDED."currency",
    "evalAmountKrw" = EXCLUDED."evalAmountKrw",
    "updatedAt" = EXCLUDED."updatedAt"
"""

UPSERT_TRADE = """
INSERT INTO "accountTrade"
    ("scope", "tradedOn", "dealId", "tradedTime", "code", "name",
     "side", "sideLabel", "quantity", "price", "amount", "fee", "currency")
VALUES (%(scope)s, %(traded_on)s, %(deal_id)s, %(traded_time)s, %(code)s, %(name)s,
        %(side)s, %(side_label)s, %(quantity)s, %(price)s, %(amount)s, %(fee)s, %(currency)s)
ON CONFLICT ("scope", "tradedOn", "dealId") DO UPDATE SET
    "tradedTime" = EXCLUDED."tradedTime",
    "code" = EXCLUDED."code",
    "name" = EXCLUDED."name",
    "side" = EXCLUDED."side",
    "sideLabel" = EXCLUDED."sideLabel",
    "quantity" = EXCLUDED."quantity",
    "price" = EXCLUDED."price",
    "amount" = EXCLUDED."amount",
    "fee" = EXCLUDED."fee",
    "currency" = EXCLUDED."currency"
"""

UPSERT_SYNC = """
INSERT INTO "accountSync" ("id", "status", "message", "publicIp", "syncedAt")
VALUES (%(id)s, %(status)s, %(message)s, %(public_ip)s, %(synced_at)s)
ON CONFLICT ("id") DO UPDATE SET
    "status" = EXCLUDED."status",
    "message" = EXCLUDED."message",
    "publicIp" = EXCLUDED."publicIp",
    "syncedAt" = EXCLUDED."syncedAt"
"""


def log(message):
	stamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
	print(f'[{stamp}] {message}', flush=True)


def collect(client):
	"""국내·해외를 각각 조회. 한쪽이 실패해도 다른 쪽은 적재한다."""
	rows = []
	errors = []

	for label, fetch, parse in (
		('국내', client.fetch_domestic, parse_domestic),
		('해외', client.fetch_overseas, parse_overseas),
	):
		try:
			body = fetch()
			message = api_error_message(body)
			if message:
				errors.append(f'{label}: {message}')
				continue
			parsed = parse(body)
			rows.extend(parsed)
			log(f'{label} 보유 종목 {len(parsed)}건')
		except KiwoomError as e:
			errors.append(f'{label}: {e}')
		except Exception as e:  # 네트워크 등 예기치 못한 오류
			errors.append(f'{label}: {e}')

	return rows, errors


def collect_trades(client, days):
	"""체결 내역 수집. 국내 TR은 날짜를 하나만 받아서 하루씩 돈다.

	days=1이면 오늘치만. 과거를 채우려면 --backfill-days로 늘린다.
	"""
	rows = []
	errors = []
	today = datetime.now()
	dates = [(today - timedelta(days=offset)) for offset in range(days)]

	def collect_domestic(day):
		ord_dt = day.strftime('%Y%m%d')
		traded_on = day.strftime('%Y-%m-%d')
		page_rows = []

		# sell_tp: 2=매수, 1=매도. 나눠 불러야 방향을 확실히 안다.
		for sell_tp, side in (('2', SIDE_BUY), ('1', SIDE_SELL)):
			def on_page(body, side=side):
				message = api_error_message(body)
				if message:
					raise KiwoomError(message)
				page_rows.extend(parse_domestic_trades(body, traded_on, side))

			complete = client.fetch_domestic_trades(ord_dt, sell_tp, on_page)
			if not complete:
				errors.append(f'국내 체결({traded_on}): 연속조회 상한에 걸려 일부만 수집')
		return page_rows

	for day in dates:
		try:
			rows.extend(collect_domestic(day))
		except KiwoomError as e:
			errors.append(f'국내 체결({day.strftime("%Y-%m-%d")}): {e}')
		except Exception as e:
			errors.append(f'국내 체결({day.strftime("%Y-%m-%d")}): {e}')

	# 해외는 기간 조회가 되므로 한 번에 받되, tp로 매수/매도를 나눠 부른다.
	for tp, side in (('4', SIDE_BUY), ('5', SIDE_SELL)):
		try:
			page_rows = []

			def on_page(body, side=side):
				message = api_error_message(body)
				if message:
					raise KiwoomError(message)
				page_rows.extend(parse_overseas_trades(body, side))

			complete = client.fetch_overseas_trades(
				dates[-1].strftime('%Y%m%d'), today.strftime('%Y%m%d'), tp, on_page
			)
			if not complete:
				errors.append('해외 체결: 연속조회 상한에 걸려 일부만 수집')
			rows.extend(page_rows)
		except Exception as e:
			errors.append(f'해외 체결({side}): {e}')

	log(f'체결 내역 {len(rows)}건 (최근 {days}일)')
	return rows, errors


def save_trades(conn, rows):
	"""체결은 누적이다. 지우지 않고 PK 기준으로 덮어쓰기만 한다."""
	if not rows:
		return
	with conn.transaction():
		with conn.cursor() as cur:
			for row in rows:
				cur.execute(UPSERT_TRADE, row)


def save(conn, rows, errors, public_ip):
	"""스냅샷을 통째로 갈아끼운다. 조회에 실패한 구간은 기존 데이터를 남겨둔다."""
	now = datetime.now(timezone.utc)
	fetched_scopes = {row['scope'] for row in rows}

	with conn.transaction():
		with conn.cursor() as cur:
			for scope in fetched_scopes:
				codes = [row['code'] for row in rows if row['scope'] == scope]
				# 이번 조회에서 사라진 종목(전량 매도) 정리
				cur.execute(
					'DELETE FROM "accountHolding" WHERE "scope" = %s AND NOT ("code" = ANY(%s))',
					(scope, codes),
				)
			for row in rows:
				cur.execute(UPSERT_HOLDING, {**row, 'now': now})

			cur.execute(UPSERT_SYNC, {
				'id': SYNC_ID,
				'status': 'error' if errors else 'ok',
				'message': ' / '.join(errors) if errors else None,
				'public_ip': public_ip,
				'synced_at': now,
			})


def run_once(database_url, trade_days=1):
	public_ip = fetch_public_ip()
	try:
		client = KiwoomClient()
	except KiwoomError as e:
		log(f'설정 오류: {e}')
		with psycopg.connect(database_url) as conn:
			save(conn, [], [str(e)], public_ip)
		return False

	rows, errors = collect(client)
	trade_rows, trade_errors = collect_trades(client, trade_days)
	errors.extend(trade_errors)

	with psycopg.connect(database_url) as conn:
		save(conn, rows, errors, public_ip)
		save_trades(conn, trade_rows)

	if errors:
		log('일부 실패: ' + ' / '.join(errors))
	log(
		f'적재 완료: 잔고 {len(rows)}건, 체결 {len(trade_rows)}건 '
		f'(공인 IP: {public_ip or "확인 불가"})'
	)
	return not errors


def main():
	parser = argparse.ArgumentParser(description='키움 계좌 잔고·체결 수집기')
	parser.add_argument('--once', action='store_true', help='1회만 실행하고 종료')
	parser.add_argument(
		'--backfill-days',
		type=int,
		default=1,
		help='체결 내역을 며칠치 조회할지 (기본 1=오늘만). 과거를 채울 때만 늘린다.',
	)
	args = parser.parse_args()

	database_url = os.environ.get('DATABASE_URL')
	if not database_url:
		log('DATABASE_URL이 설정되지 않았습니다.')
		sys.exit(1)

	interval = int(os.environ.get('SYNC_INTERVAL_SEC', DEFAULT_INTERVAL_SEC))

	trade_days = max(1, args.backfill_days)

	if args.once:
		sys.exit(0 if run_once(database_url, trade_days) else 1)

	log(f'수집 시작 (주기 {interval}초). 중지하려면 Ctrl+C.')
	while True:
		try:
			# 상주 실행 중에는 오늘치 체결만 본다. 과거는 --backfill-days로 한 번 채운다.
			run_once(database_url, 1)
		except Exception as e:
			# 한 번의 실패로 루프가 죽지 않도록 한다.
			log(f'예기치 못한 오류: {e}')
		time.sleep(interval)


if __name__ == '__main__':
	try:
		from dotenv import load_dotenv

		load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
	except ImportError:
		pass
	main()
