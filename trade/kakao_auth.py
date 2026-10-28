"""카카오톡 OAuth 2.0 토큰 발급 헬퍼 스크립트.

카카오 개발자 콘솔에서 발급받은 REST API 키로 브라우저 인증을 거쳐
Access Token과 Refresh Token을 발급받아 trade/.env 파일에 자동 저장합니다.

macOS의 AirPlay 수신 모드(5000번 포트 점유)로 인해 브라우저에
'localhost에 대한 액세스가 거부됨 (HTTP 403)'이 뜨더라도,
브라우저 주소창의 전체 URL을 그대로 복사하여 터미널에 붙여넣기만 하면
즉시 토큰이 정상 발급됩니다.
"""

import json
import os
import re
import sys
import urllib.parse
import webbrowser
from pathlib import Path

import requests
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / '.env'
load_dotenv(ENV_PATH)

KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'


def extract_code(user_input: str) -> str:
	"""사용자가 전체 URL 또는 code 값을 입력했을 때 순수 인가 코드를 추출합니다."""
	user_input = user_input.strip()
	if 'code=' in user_input:
		match = re.search(r'[?&]code=([^&]+)', user_input)
		if match:
			return match.group(1)
	return user_input


def update_env_file(key_values: dict):
	"""trade/.env 파일에 키-값 쌍을 업데이트하거나 추가합니다."""
	env_lines = []
	existing_keys = set()
	if ENV_PATH.exists():
		with open(ENV_PATH, 'r', encoding='utf-8') as f:
			env_lines = f.readlines()

	new_lines = []
	for line in env_lines:
		matched = False
		for k, v in key_values.items():
			if line.startswith(f'{k}='):
				new_lines.append(f'{k}={v}\n')
				existing_keys.add(k)
				matched = True
				break
		if not matched:
			new_lines.append(line)

	for k, v in key_values.items():
		if k not in existing_keys:
			if new_lines and not new_lines[-1].endswith('\n'):
				new_lines[-1] += '\n'
			new_lines.append(f'{k}={v}\n')

	with open(ENV_PATH, 'w', encoding='utf-8') as f:
		f.writelines(new_lines)


def request_token(rest_api_key: str, redirect_uri: str, auth_code: str, client_secret: str = None):
	"""카카오 서버에 토큰 발급을 요청합니다."""
	post_data = {
		'grant_type': 'authorization_code',
		'client_id': rest_api_key,
		'redirect_uri': redirect_uri,
		'code': auth_code,
	}
	if client_secret:
		post_data['client_secret'] = client_secret

	headers = {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
	return requests.post(KAKAO_TOKEN_URL, data=post_data, headers=headers, timeout=10)


def main():
	print('========================================================')
	print('🔑 [CatchStock] 카카오톡 토큰 발급 도우미')
	print('========================================================')

	rest_api_key = os.environ.get('KAKAO_REST_API_KEY', '').strip()
	if not rest_api_key or rest_api_key == 'your-kakao-developers-rest-api-key':
		rest_api_key = input('\n카카오 REST API 키를 입력하세요: ').strip()

	if not rest_api_key:
		print('❌ REST API 키가 없습니다.')
		sys.exit(1)

	# 등록된 Redirect URI (기본값: http://localhost:5000/oauth)
	redirect_uri = 'http://localhost:5000/oauth'

	auth_params = {
		'client_id': rest_api_key,
		'redirect_uri': redirect_uri,
		'response_type': 'code',
		'scope': 'talk_message',
	}
	login_url = f'{KAKAO_AUTH_URL}?{urllib.parse.urlencode(auth_params)}'

	print(f'\n• REST API 키: {rest_api_key}')
	print(f'• Redirect URI: {redirect_uri}')
	print('--------------------------------------------------------')
	print('💡 안내:')
	print('1. 아래 링크를 브라우저에서 열고 [동의하고 계속하기]를 진행하세요.')
	print('2. 맥(macOS)에서는 AirPlay 기능 때문에 리다이렉트 후 브라우저 화면에')
	print('   "localhost에 대한 액세스가 거부됨 (HTTP 403)" 이라는 에러 페이지가 뜰 수 있습니다.')
	print('   ★ 이것은 정상이며, 브라우저 주소창을 보시면 이미 code=... 가 포함되어 있습니다!')
	print('3. 주소창의 전체 URL(또는 code= 뒷부분)을 복사해서 아래에 붙여넣어 주세요.')
	print('--------------------------------------------------------')
	print(f'👉 카카오 로그인 링크:\n{login_url}\n')

	# 브라우저 자동 오픈 시도
	try:
		webbrowser.open(login_url)
	except Exception:
		pass

	raw_input = input('📋 주소창의 전체 URL 또는 code 값을 붙여넣으세요: ').strip()
	auth_code = extract_code(raw_input)

	if not auth_code:
		print('❌ 유효한 인가 코드가 입력되지 않았습니다.')
		sys.exit(1)

	print(f'\n[2단계] 카카오 서버에 토큰 발급 요청 중 (코드: {auth_code[:15]}...)...')
	client_secret = os.environ.get('KAKAO_CLIENT_SECRET', '').strip() or None

	token_res = request_token(rest_api_key, redirect_uri, auth_code, client_secret)

	# KOE010 (Client Secret 필요) 에러 처리
	if token_res.status_code != 200 and 'KOE010' in token_res.text:
		print('\n⚠️  카카오 인증 에러: KOE010 (Bad client credentials)')
		print('카카오 디벨로퍼스 [카카오 로그인] > [보안] 탭에서 Client Secret(보안코드)이 활성화되어 있습니다.')
		print('선택 1) 콘솔 [보안] 탭에 표시된 [Client Secret 코드]를 복사해서 입력하세요.')
		print('선택 2) 또는 콘솔 [보안] 탭에서 활성화 상태를 "사용 안 함"으로 변경한 후 Enter만 누르세요.')
		secret_input = input('Client Secret 코드 (사용 안 함으로 바꿨으면 그냥 Enter): ').strip()

		if secret_input:
			client_secret = secret_input
		token_res = request_token(rest_api_key, redirect_uri, auth_code, client_secret)

	if token_res.status_code != 200:
		print(f'\n❌ 토큰 발급 실패 (HTTP {token_res.status_code}): {token_res.text}')
		print('\n[팁] 인가 코드(code)는 1회용이므로, 이미 사용되었거나 시간이 지났다면')
		print('카카오 로그인 링크를 다시 열어 새로운 코드를 발급받아 붙여넣어 주세요.')
		sys.exit(1)

	data = token_res.json()
	access_token = data.get('access_token')
	refresh_token = data.get('refresh_token')

	if not access_token:
		print(f'❌ 토큰 데이터 오류: {data}')
		sys.exit(1)

	print('\n[3단계] 🎉 토큰 발급 성공! .env 파일에 저장 중...')
	env_updates = {
		'KAKAO_REST_API_KEY': rest_api_key,
		'KAKAO_ACCESS_TOKEN': access_token,
		'KAKAO_REFRESH_TOKEN': refresh_token or '',
	}
	if client_secret:
		env_updates['KAKAO_CLIENT_SECRET'] = client_secret

	update_env_file(env_updates)
	print(f'✅ {ENV_PATH} 파일에 토큰이 성공적으로 저장되었습니다!')
	print('--------------------------------------------------------')
	print(f'• KAKAO_ACCESS_TOKEN  : {access_token[:15]}... (보안상 앞자리만 표시)')
	if refresh_token:
		print(f'• KAKAO_REFRESH_TOKEN : {refresh_token[:15]}... (만료 시 자동 갱신용)')
	print('--------------------------------------------------------')

	# 테스트 발송
	print('\n🔔 내 카카오톡으로 환전 알림 테스트 메시지를 지금 발송해볼까요?')
	try:
		ans = input('발송하시겠습니까? [Y/n]: ').strip().lower()
	except (KeyboardInterrupt, EOFError):
		ans = 'n'

	if ans in ('', 'y', 'yes'):
		from kakao import send_exchange_notification
		ok, msg = send_exchange_notification(
			sold_usd=100.0,
			received_krw=145000.0,
			exchange_rate=1450.0,
			access_token=access_token,
			refresh_token_val=refresh_token,
			rest_api_key=rest_api_key,
			client_secret=client_secret,
		)
		if ok:
			print(f'🎉 카카오톡 테스트 알림이 성공적으로 도착했습니다! ({msg})')
		else:
			print(f'⚠️ 발송 실패: {msg}')

	print('\n모든 설정이 완료되었습니다! 매월 21일 환전 완료 시 자동으로 카톡 알림이 발송됩니다.')


if __name__ == '__main__':
	main()
