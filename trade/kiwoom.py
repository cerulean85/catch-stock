"""키움 REST API 클라이언트. 토큰 발급 + 잔고 TR 호출."""

import os

import requests

MOCK_HOST = 'https://mockapi.kiwoom.com'
LIVE_HOST = 'https://api.kiwoom.com'

TIMEOUT_SEC = 10

# 연속조회 상한. 개인 계좌의 하루치가 이보다 많을 일은 없지만 무한 루프는 막는다.
MAX_PAGES = 20


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

	def _post(self, endpoint, api_id, body, cont_yn=None, next_key=None):
		headers = {
			'Content-Type': 'application/json;charset=UTF-8',
			'authorization': f'Bearer {self._get_token()}',
			'api-id': api_id,
		}
		if cont_yn:
			headers['cont-yn'] = cont_yn
		if next_key:
			headers['next-key'] = next_key

		response = requests.post(
			f'{self.host}{endpoint}', headers=headers, json=body, timeout=TIMEOUT_SEC
		)
		if response.status_code == 401:
			raise _Unauthorized()
		if response.status_code != 200:
			raise KiwoomError(f'{api_id} 요청 실패 (HTTP {response.status_code})')
		return response.json(), response.headers

	def request(self, endpoint, api_id, body, cont_yn=None, next_key=None):
		"""토큰 만료로 401이 나면 토큰을 버리고 한 번만 재시도한다."""
		try:
			return self._post(endpoint, api_id, body, cont_yn, next_key)
		except _Unauthorized:
			self._token = None
			try:
				return self._post(endpoint, api_id, body, cont_yn, next_key)
			except _Unauthorized:
				raise KiwoomError('인증 실패 (401). 앱키·시크릿키와 등록 IP를 확인해주세요.')

	def request_pages(self, endpoint, api_id, body, on_page, max_pages=MAX_PAGES):
		"""연속조회(cont-yn/next-key)를 따라가며 각 페이지 body를 on_page에 넘긴다."""
		cont_yn = None
		next_key = None
		for _ in range(max_pages):
			page, headers = self.request(endpoint, api_id, body, cont_yn, next_key)
			on_page(page)
			if headers.get('cont-yn') != 'Y' or not headers.get('next-key'):
				return True
			cont_yn = 'Y'
			next_key = headers.get('next-key')
		return False  # 페이지 상한에 걸림

	def fetch_domestic(self):
		"""kt00004 계좌평가현황요청."""
		body, _ = self.request('/api/dostk/acnt', 'kt00004', {'qry_tp': '0', 'dmst_stex_tp': 'KRX'})
		return body

	def fetch_overseas(self):
		"""ust21070 미국주식 잔고확인."""
		body, _ = self.request('/api/us/acnt', 'ust21070', {'stex_tp': '', 'stk_cd': ''})
		return body

	def fetch_domestic_trades(self, ord_dt, sell_tp, on_page):
		"""kt00007 계좌별주문체결내역상세. 하루치만 조회한다(TR이 날짜 하나만 받는다).

		sell_tp로 매수/매도를 나눠 부른다. 응답 문자열을 추측하는 것보다 확실하다.
		"""
		return self.request_pages('/api/dostk/acnt', 'kt00007', {
			'ord_dt': ord_dt,
			'qry_tp': '4',        # 체결내역만
			'stk_bond_tp': '1',   # 주식
			'sell_tp': sell_tp,   # 1:매도, 2:매수
			'stk_cd': '',
			'fr_ord_no': '',
			'dmst_stex_tp': '%',  # 전체 거래소
		}, on_page)

	def fetch_overseas_trades(self, start_dt, end_dt, tp, on_page):
		"""ust21100 미국주식 거래내역. 기간 조회가 되고, tp로 매수/매도를 나눈다.

		tp=3(매매)으로 부르면 거래종류명이 전부 '매매'로 와서 방향을 알 수 없다.
		"""
		return self.request_pages('/api/us/acnt', 'ust21100', {
			'strt_dt': start_dt,
			'end_dt': end_dt,
			'tp': tp,                 # 4:매수, 5:매도
			'stex_tp': '',
			'stk_cd': '',
			'krw_repl_skip_yn': 'Y',  # 원화대용 입출금 제외
		}, on_page)


class _Unauthorized(Exception):
	pass


def fetch_public_ip():
	"""키움에 등록해야 할 IP. 실패해도 수집은 계속되도록 None으로 떨어뜨린다."""
	try:
		response = requests.get('https://api.ipify.org?format=json', timeout=5)
		return response.json().get('ip') if response.status_code == 200 else None
	except Exception:
		return None
