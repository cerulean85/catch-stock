"""키움 응답 -> DB에 넣을 행으로 변환하는 순수 함수 모음."""

SCOPE_DOMESTIC = 'domestic'
SCOPE_OVERSEAS = 'overseas'


def to_number(value):
	"""키움의 숫자는 부호·0 패딩이 붙은 문자열('+000000012345')로 온다. 실패는 0."""
	if isinstance(value, (int, float)):
		return float(value)
	if not isinstance(value, str):
		return 0.0
	text = value.strip().lstrip('+')
	if not text:
		return 0.0
	try:
		return float(text)
	except ValueError:
		return 0.0


def to_text(value):
	return value.strip() if isinstance(value, str) else ''


def parse_domestic(body):
	"""kt00004(계좌평가현황요청) 응답 -> 보유 종목 행."""
	rows = body.get('stk_acnt_evlt_prst')
	if not isinstance(rows, list):
		return []

	return [
		{
			'scope': SCOPE_DOMESTIC,
			'code': to_text(row.get('stk_cd')),
			'name': to_text(row.get('stk_nm')),
			'quantity': to_number(row.get('rmnd_qty')),
			'avg_price': to_number(row.get('avg_prc')),
			'current_price': to_number(row.get('cur_prc')),
			'eval_amount': to_number(row.get('evlt_amt')),
			'pnl_amount': to_number(row.get('pl_amt')),
			'pnl_rate': to_number(row.get('pl_rt')),
			'currency': 'KRW',
			'eval_amount_krw': None,
		}
		for row in rows
		if to_text(row.get('stk_cd'))
	]


def parse_overseas(body):
	"""ust21070(미국주식 잔고확인) 응답 -> 보유 종목 행."""
	rows = body.get('result_list')
	if not isinstance(rows, list):
		return []

	result = []
	for row in rows:
		code = to_text(row.get('stk_cd'))
		if not code:
			continue
		result.append({
			'scope': SCOPE_OVERSEAS,
			'code': code,
			'name': to_text(row.get('frgn_stk_nm')) or code,
			'quantity': to_number(row.get('poss_qty')),
			'avg_price': to_number(row.get('frgn_stk_book_uv')),
			'current_price': to_number(row.get('now_pric')),
			'eval_amount': to_number(row.get('evlt_amt')),
			'pnl_amount': to_number(row.get('pl_amt')),
			'pnl_rate': to_number(row.get('pl_rt')),
			'currency': to_text(row.get('crnc_code')) or 'USD',
			'eval_amount_krw': to_number(row.get('evlt_amt_krw')),
		})
	return result


def api_error_message(body):
	"""키움은 HTTP 200에도 return_code로 실패를 알린다. 실패면 메시지, 정상이면 None."""
	code = body.get('return_code')
	if code is None:
		return None
	if str(code) == '0':
		return None
	return to_text(body.get('return_msg')) or f'조회 실패 (return_code: {code})'
