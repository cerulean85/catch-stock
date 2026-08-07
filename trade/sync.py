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
from datetime import datetime, timezone

import psycopg

from kiwoom import KiwoomClient, KiwoomError, fetch_public_ip
from parse import (
	SCOPE_DOMESTIC,
	SCOPE_OVERSEAS,
	api_error_message,
	parse_domestic,
	parse_overseas,
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


def run_once(database_url):
	public_ip = fetch_public_ip()
	try:
		client = KiwoomClient()
	except KiwoomError as e:
		log(f'설정 오류: {e}')
		with psycopg.connect(database_url) as conn:
			save(conn, [], [str(e)], public_ip)
		return False

	rows, errors = collect(client)
	with psycopg.connect(database_url) as conn:
		save(conn, rows, errors, public_ip)

	if errors:
		log('일부 실패: ' + ' / '.join(errors))
	log(f'적재 완료: {len(rows)}건 (공인 IP: {public_ip or "확인 불가"})')
	return not errors


def main():
	parser = argparse.ArgumentParser(description='키움 계좌 잔고 수집기')
	parser.add_argument('--once', action='store_true', help='1회만 실행하고 종료')
	args = parser.parse_args()

	database_url = os.environ.get('DATABASE_URL')
	if not database_url:
		log('DATABASE_URL이 설정되지 않았습니다.')
		sys.exit(1)

	interval = int(os.environ.get('SYNC_INTERVAL_SEC', DEFAULT_INTERVAL_SEC))

	if args.once:
		sys.exit(0 if run_once(database_url) else 1)

	log(f'수집 시작 (주기 {interval}초). 중지하려면 Ctrl+C.')
	while True:
		try:
			run_once(database_url)
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
