"""키움 REST API 클라이언트. 토큰 발급 + 잔고 TR 호출."""

import os

import requests

MOCK_HOST = 'https://mockapi.kiwoom.com'
LIVE_HOST = 'https://api.kiwoom.com'

TIMEOUT_SEC = 10


class KiwoomError(Exception):
	pass


class KiwoomClient:
	def __init__(self, app_key=None, secret_key=None, is_mock=None):
		self.app_key = app_key or os.environ.get('KIWOOM_APP_KEY')
		self.secret_key = secret_key or os.environ.get('KIWOOM_SECRET_KEY')
		if is_mock is None:
			is_mock = os.environ.get('KIWOOM_MOCK', 'false').lower() == 'true'
		self.host = MOCK_HOST if is_mock else LIVE_HOST
		self._token = None

		if not self.app_key or not self.secret_key:
			raise KiwoomError('KIWOOM_APP_KEY / KIWOOM_SECRET_KEY가 설정되지 않았습니다.')

	def _issue_token(self):
		response = requests.post(
			f'{self.host}/oauth2/token',
			headers={'Content-Type': 'application/json;charset=UTF-8'},
			json={
				'grant_type': 'client_credentials',
				'appkey': self.app_key,
				'secretkey': self.secret_key,
			},
			timeout=TIMEOUT_SEC,
		)
		if response.status_code != 200:
			raise KiwoomError(f'토큰 발급 실패 (HTTP {response.status_code})')

		body = response.json()
		token = body.get('token') or body.get('access_token')
		if not token:
			raise KiwoomError('토큰 발급 응답에 토큰이 없습니다.')
		return token

	def _get_token(self):
		if not self._token:
			self._token = self._issue_token()
		return self._token

	def _post(self, endpoint, api_id, body):
		response = requests.post(
			f'{self.host}{endpoint}',
			headers={
				'Content-Type': 'application/json;charset=UTF-8',
				'authorization': f'Bearer {self._get_token()}',
				'api-id': api_id,
			},
			json=body,
			timeout=TIMEOUT_SEC,
		)
		if response.status_code == 401:
			raise _Unauthorized()
		if response.status_code != 200:
			raise KiwoomError(f'{api_id} 요청 실패 (HTTP {response.status_code})')
		return response.json()

	def request(self, endpoint, api_id, body):
		"""토큰 만료로 401이 나면 토큰을 버리고 한 번만 재시도한다."""
		try:
			return self._post(endpoint, api_id, body)
		except _Unauthorized:
			self._token = None
			try:
				return self._post(endpoint, api_id, body)
			except _Unauthorized:
				raise KiwoomError('인증 실패 (401). 앱키·시크릿키와 등록 IP를 확인해주세요.')

	def fetch_domestic(self):
		"""kt00004 계좌평가현황요청."""
		return self.request('/api/dostk/acnt', 'kt00004', {'qry_tp': '0', 'dmst_stex_tp': 'KRX'})

	def fetch_overseas(self):
		"""ust21070 미국주식 잔고확인."""
		return self.request('/api/us/acnt', 'ust21070', {'stex_tp': '', 'stk_cd': ''})


class _Unauthorized(Exception):
	pass


def fetch_public_ip():
	"""키움에 등록해야 할 IP. 실패해도 수집은 계속되도록 None으로 떨어뜨린다."""
	try:
		response = requests.get('https://api.ipify.org?format=json', timeout=5)
		return response.json().get('ip') if response.status_code == 200 else None
	except Exception:
		return None
