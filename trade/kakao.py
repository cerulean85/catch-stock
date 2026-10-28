"""카카오톡 '나에게 보내기' 메시지 전송 모듈.

환전이 완료되었을 때 카카오톡으로 환전 내역과 함께
키움증권 영웅문S# 앱으로 바로 갈 수 있는 버튼 링크를 전송합니다.

필요 환경 변수 (.env):
    KAKAO_REST_API_KEY: 카카오 디벨로퍼스 REST API 키 (선택: 토큰 갱신 시 필요)
    KAKAO_ACCESS_TOKEN: 카카오톡 메시지 전송용 액세스 토큰 (필수)
    KAKAO_REFRESH_TOKEN: 토큰 만료 시 자동 갱신용 리프레시 토큰 (선택)
    KIWOOM_APP_URL: 카카오톡 버튼 클릭 시 이동할 URL (기본값: https://m.kiwoom.com)
"""

import json
import os
import requests

KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
KAKAO_SEND_MEMO_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send'
DEFAULT_KIWOOM_URL = 'heromts://'
DEFAULT_KIWOOM_WEB_URL = 'https://m.kiwoom.com'


class KakaoError(Exception):
	pass


def refresh_token(rest_api_key, refresh_token_val, client_secret=None):
	"""리프레시 토큰을 이용해 새로운 액세스 토큰을 발급받습니다."""
	if not rest_api_key or not refresh_token_val:
		raise KakaoError('토큰 갱신에 필요한 KAKAO_REST_API_KEY 또는 KAKAO_REFRESH_TOKEN이 없습니다.')

	client_secret = client_secret or os.environ.get('KAKAO_CLIENT_SECRET')
	data = {
		'grant_type': 'refresh_token',
		'client_id': rest_api_key,
		'refresh_token': refresh_token_val,
	}
	if client_secret:
		data['client_secret'] = client_secret

	response = requests.post(
		KAKAO_TOKEN_URL,
		data=data,
		timeout=10,
	)

	if response.status_code != 200:
		raise KakaoError(f'카카오 토큰 갱신 실패 (HTTP {response.status_code}): {response.text}')

	data = response.json()
	new_access_token = data.get('access_token')
	if not new_access_token:
		raise KakaoError('토큰 갱신 응답에 access_token이 없습니다.')

	return new_access_token, data.get('refresh_token')


def send_exchange_notification(
	sold_usd,
	received_krw,
	exchange_rate,
	app_url=None,
	access_token=None,
	refresh_token_val=None,
	rest_api_key=None,
	client_secret=None,
):
	"""환전 성공 카카오톡 알림을 전송합니다."""
	if access_token is None:
		access_token = os.environ.get('KAKAO_ACCESS_TOKEN')
	if refresh_token_val is None:
		refresh_token_val = os.environ.get('KAKAO_REFRESH_TOKEN')
	if rest_api_key is None:
		rest_api_key = os.environ.get('KAKAO_REST_API_KEY')
	if client_secret is None:
		client_secret = os.environ.get('KAKAO_CLIENT_SECRET')
	mobile_link = app_url or os.environ.get('KIWOOM_APP_URL') or DEFAULT_KIWOOM_URL
	web_link = os.environ.get('KIWOOM_WEB_URL') or DEFAULT_KIWOOM_WEB_URL

	if not access_token and not refresh_token_val:
		return False, 'KAKAO_ACCESS_TOKEN 또는 KAKAO_REFRESH_TOKEN이 설정되지 않아 카카오톡 알림을 건너뜁니다.'

	# 액세스 토큰이 없고 리프레시 토큰만 있는 경우 즉시 갱신
	if not access_token and refresh_token_val and rest_api_key:
		try:
			access_token, _ = refresh_token(rest_api_key, refresh_token_val, client_secret)
		except KakaoError as e:
			return False, f'카카오 토큰 갱신 실패: {e}'

	message_text = (
		"🔔 [CatchStock] 미국주식 수익 20% 환전 완료!\n\n"
		f"• 매도 달러: ${sold_usd:,.2f} USD\n"
		f"• 입금 원화: ₩{received_krw:,.0f} KRW\n"
		f"• 적용 환율: {exchange_rate:,.2f} KRW/USD\n\n"
		"신한은행으로 송금하시려면 아래 버튼을 눌러 영웅문S# 앱을 실행하세요!"
	)

	template_object = {
		'object_type': 'text',
		'text': message_text,
		'link': {
			'web_url': web_link,
			'mobile_web_url': mobile_link,
		},
		'button_title': '영웅문S# 앱 열기',
		'buttons': [
			{
				'title': '영웅문S# 앱 열기',
				'link': {
					'web_url': web_link,
					'mobile_web_url': mobile_link,
				},
			}
		],
	}

	headers = {
		'Authorization': f'Bearer {access_token}',
		'Content-Type': 'application/x-www-form-urlencoded',
	}

	def _post_memo(token):
		return requests.post(
			KAKAO_SEND_MEMO_URL,
			headers={'Authorization': f'Bearer {token}'},
			data={'template_object': json.dumps(template_object, ensure_ascii=False)},
			timeout=10,
		)

	response = _post_memo(access_token)

	# 401 인증 실패(토큰 만료) 시 리프레시 토큰으로 1회 갱신 시도
	if response.status_code == 401 and refresh_token_val and rest_api_key:
		try:
			new_access_token, _ = refresh_token(rest_api_key, refresh_token_val, client_secret)
			response = _post_memo(new_access_token)
		except KakaoError as e:
			return False, f'토큰 만료 재시도 실패: {e}'

	if response.status_code != 200:
		return False, f'카카오톡 전송 실패 (HTTP {response.status_code}): {response.text}'

	res_json = response.json()
	if res_json.get('result_code') != 0:
		return False, f'카카오톡 응답 오류 (code {res_json.get("result_code")}): {res_json}'

	return True, '카카오톡 나에게 보내기 전송 성공'
