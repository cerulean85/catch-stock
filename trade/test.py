import requests
import json

# 접근토큰 발급
def fn_au10001(data):
	# 1. 요청할 API URL
	#host = 'https://mockapi.kiwoom.com' # 모의투자
	host = 'https://api.kiwoom.com' # 실전투자
	endpoint = '/oauth2/token'
	url =  host + endpoint

	# 2. header 데이터
	headers = {
		'Content-Type': 'application/json;charset=UTF-8', # 컨텐츠타입
	}

	# 3. http POST 요청
	response = requests.post(url, headers=headers, json=data)

	# 4. 응답 상태 코드와 데이터 출력
	print('Code:', response.status_code)
	print('Header:', json.dumps({key: response.headers.get(key) for key in ['next-key', 'cont-yn', 'api-id']}, indent=4, ensure_ascii=False))
	print('Body:', json.dumps(response.json(), indent=4, ensure_ascii=False))  # JSON 응답을 파싱하여 출력

# 계좌평가현황요청 (보유 종목 리스트 조회)
def fn_kt00004(access_token, is_mock=False):
	# 1. 요청할 API URL
	host = 'https://mockapi.kiwoom.com' if is_mock else 'https://api.kiwoom.com'
	endpoint = '/api/dostk/acnt'
	url = host + endpoint

	# 2. Header 데이터
	headers = {
		'Content-Type': 'application/json;charset=UTF-8',
		'authorization': f'Bearer {access_token}',
		'api-id': 'kt00004'  # 계좌평가현황요청 TR 코드
	}

	# 3. Body 데이터
	body = {
		'qry_tp': '0',          # 0: 전체, 1: 보유
		'dmst_stex_tp': 'KRX'   # KRX: 한국거래소
	}

	# 4. HTTP POST 요청
	response = requests.post(url, headers=headers, json=body)

	# 5. 응답 확인 및 보유 종목 출력
	print('\n=== [kt00004] 계좌 보유 종목 조회 결과 ===')
	print('Code:', response.status_code)
	res_json = response.json()
	print('Header:', json.dumps({key: response.headers.get(key) for key in ['next-key', 'cont-yn', 'api-id']}, indent=4, ensure_ascii=False))
	print('Body:', json.dumps(res_json, indent=4, ensure_ascii=False))

	# 보유 종목 리스트만 깔끔하게 정리하여 출력
	holdings = res_json.get('stk_acnt_evlt_prst', [])
	if holdings:
		print('\n--- [보유 종목 목록] ---')
		for item in holdings:
			stk_cd = item.get('stk_cd', '')
			stk_nm = item.get('stk_nm', '')
			qty = int(item.get('rmnd_qty', 0))
			avg_prc = float(item.get('avg_prc', 0))
			cur_prc = float(item.get('cur_prc', 0))
			evlt_amt = int(item.get('evlt_amt', 0))
			pl_amt = int(item.get('pl_amt', 0))
			pl_rt = float(item.get('pl_rt', 0.0))
			print(f"종목: {stk_nm}({stk_cd}) | 수량: {qty:,.0f}주 | 평균가: {avg_prc:,.0f}원 | 현재가: {cur_prc:,.0f}원 | 평가금액: {evlt_amt:,.0f}원 | 손익: {pl_amt:,.0f}원 ({pl_rt:+.2f}%)")
	else:
		print('\n보유 중인 종목이 없거나 조회가 되지 않았습니다.')

	return res_json

# 미국/해외주식 잔고확인 (해외 주식 보유 종목 리스트 조회)
def fn_ust21070(access_token, is_mock=False):
	# 1. 요청할 API URL
	host = 'https://mockapi.kiwoom.com' if is_mock else 'https://api.kiwoom.com'
	endpoint = '/api/us/acnt'
	url = host + endpoint

	# 2. Header 데이터
	headers = {
		'Content-Type': 'application/json;charset=UTF-8',
		'authorization': f'Bearer {access_token}',
		'api-id': 'ust21070'  # 미국주식 잔고확인 TR 코드
	}

	# 3. Body 데이터
	body = {
		'stex_tp': '',  # 거래소 구분 (빈값: 전체, ND: 나스닥, NY: 뉴욕, NA: 아멕스)
		'stk_cd': ''    # 종목코드 (빈값: 전체)
	}

	# 4. HTTP POST 요청
	response = requests.post(url, headers=headers, json=body)

	# 5. 응답 확인 및 보유 종목 출력
	print('\n=== [ust21070] 해외 주식 보유 종목 조회 결과 ===')
	print('Code:', response.status_code)
	res_json = response.json()
	print('Header:', json.dumps({key: response.headers.get(key) for key in ['next-key', 'cont-yn', 'api-id']}, indent=4, ensure_ascii=False))
	print('Body:', json.dumps(res_json, indent=4, ensure_ascii=False))

	# 해외 보유 종목 리스트 출력
	holdings = res_json.get('result_list', [])
	if holdings:
		print('\n--- [해외 주식 보유 종목 목록] ---')
		for item in holdings:
			stk_cd = item.get('stk_cd', '')
			stk_nm = item.get('frgn_stk_nm', '')
			crnc = item.get('crnc_code', 'USD')
			qty = float(item.get('poss_qty', 0))
			buy_uv = float(item.get('frgn_stk_book_uv', 0))
			cur_prc = float(item.get('now_pric', 0))
			evlt_amt = float(item.get('evlt_amt', 0))
			pl_amt = float(item.get('pl_amt', 0))
			pl_rt = float(item.get('pl_rt', 0.0))
			evlt_krw = int(float(item.get('evlt_amt_krw', 0)))
			
			print(f"종목: {stk_nm}({stk_cd}) | 수량: {qty:,.0f}주 | 매입단가: {buy_uv:,.2f} {crnc} | 현재가: {cur_prc:,.2f} {crnc} | 평가금액: {evlt_amt:,.2f} {crnc} ({evlt_krw:,.0f}원) | 손익: {pl_amt:,.2f} {crnc} ({pl_rt:+.2f}%)")
	else:
		print('\n보유 중인 해외 주식이 없거나 조회가 되지 않았습니다.')

	return res_json

# 실행 구간
if __name__ == '__main__':
	# 1. 토큰 발급 요청 데이터
	params = {
		'grant_type': 'client_credentials',  # grant_type
		'appkey': '...',  # 앱키
		'secretkey': '...',  # 시크릿키
	}

	# 2. 토큰 발급 (실전/모의 여부에 맞춰 host 설정)
	is_mock_env = False  # 실전투자: False, 모의투자: True
	token_host = 'https://mockapi.kiwoom.com' if is_mock_env else 'https://api.kiwoom.com'
	
	token_response = requests.post(
		token_host + '/oauth2/token',
		headers={'Content-Type': 'application/json;charset=UTF-8'},
		json=params
	)
	
	if token_response.status_code == 200:
		token_data = token_response.json()
		access_token = token_data.get('token') or token_data.get('access_token')
		print('액세스 토큰 발급 성공!')
		print(access_token)
		
		if access_token:
			# 3-1. 국내 주식 보유 종목 조회 API 호출 (kt00004)
			# fn_kt00004(access_token=access_token, is_mock=is_mock_env)
			
			# 3-2. 해외 주식 보유 종목 조회 API 호출 (ust21070)
			fn_ust21070(access_token=access_token, is_mock=is_mock_env)
	else:
		print('토큰 발급 실패:', token_response.status_code, token_response.text)

