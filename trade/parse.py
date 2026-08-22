"""키움 응답 -> DB에 넣을 행으로 변환하는 순수 함수 모음."""

import re

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


def _iso_date(yyyymmdd):
	"""'20260807' -> '2026-08-07'. 형식이 아니면 원문 그대로."""
	text = to_text(yyyymmdd)
	if len(text) == 8 and text.isdigit():
		return f'{text[0:4]}-{text[4:6]}-{text[6:8]}'
	return text


def _strip_code_prefix(code):
	"""국내 종목번호는 'A005930'처럼 접두어(A/J/Q)가 붙어 온다. 잔고와 맞추려면 떼야 한다."""
	text = to_text(code)
	if len(text) == 7 and text[0].isalpha() and text[1:].isdigit():
		return text[1:]
	return text


SIDE_BUY = 'buy'
SIDE_SELL = 'sell'
SIDE_UNKNOWN = 'other'


def normalize_side(text, fallback=SIDE_UNKNOWN):
	"""'현금매수' -> buy, '매도정정' -> sell. 판단 불가면 fallback."""
	value = to_text(text)
	if '매도' in value:
		return SIDE_SELL
	if '매수' in value:
		return SIDE_BUY
	return fallback


def parse_domestic_trades(body, traded_on, side):
	"""kt00007(계좌별주문체결내역상세) 응답 -> 체결 행. 체결수량이 0인 주문은 제외."""
	rows = body.get('acnt_ord_cntr_prps_dtl')
	if not isinstance(rows, list):
		return []

	result = []
	for row in rows:
		deal_id = to_text(row.get('ord_no'))
		quantity = to_number(row.get('cntr_qty'))
		if not deal_id or quantity == 0:
			continue
		price = to_number(row.get('cntr_uv'))
		result.append({
			'scope': SCOPE_DOMESTIC,
			'traded_on': traded_on,
			'deal_id': deal_id,
			'traded_time': to_text(row.get('ord_tm')) or None,
			'code': _strip_code_prefix(row.get('stk_cd')),
			'name': to_text(row.get('stk_nm')),
			# 요청에서 이미 매수/매도를 나눠 불렀다. 응답 문자열은 더 구체적일 때만 신뢰.
			'side': normalize_side(row.get('io_tp_nm'), fallback=side),
			'side_label': to_text(row.get('io_tp_nm')) or to_text(row.get('trde_tp')) or None,
			'quantity': quantity,
			'price': price,
			'amount': quantity * price,
			'fee': None,
			'currency': 'KRW',
		})
	return result


def parse_overseas_trades(body, side):
	"""ust21100(미국주식 거래내역) 응답 -> 체결 행. 종목코드 없는 입출금 행은 제외."""
	rows = body.get('result_list')
	if not isinstance(rows, list):
		return []

	result = []
	for row in rows:
		deal_id = to_text(row.get('deal_no'))
		code = to_text(row.get('stk_cd'))
		if not deal_id or not code:
			continue
		result.append({
			'scope': SCOPE_OVERSEAS,
			'traded_on': _iso_date(row.get('deal_dt')),
			'deal_id': deal_id,
			'traded_time': None,
			'code': code,
			'name': to_text(row.get('stk_nm')) or code,
			# deal_kind_nm은 매수·매도 모두 '매매'로 와서 방향을 알 수 없다.
			# 적요명(rmrk_nm)에 방향이 있으면 쓰고, 없으면 요청 시 지정한 tp를 따른다.
			'side': normalize_side(row.get('rmrk_nm'), fallback=side),
			'side_label': to_text(row.get('rmrk_nm')) or to_text(row.get('deal_kind_nm')) or None,
			'quantity': to_number(row.get('deal_qty')),
			'price': to_number(row.get('uv_exrt')),
			'amount': to_number(row.get('fc_deal_amt')) or to_number(row.get('deal_amt')),
			'fee': to_number(row.get('fc_cmsn')),
			'currency': 'USD',
		})
	return result


# 표현이 '관련자료가 없습니다', '조회할 자료가 없습니다'처럼 조금씩 달라 어미로 잡는다.
NO_DATA_PATTERN = re.compile(r'자료가?\s*없습니다')


def api_error_message(body):
	"""키움은 HTTP 200에도 return_code로 실패를 알린다. 실패면 메시지, 정상이면 None.

	조회 기간에 체결이 없으면 키움은 '관련자료가 없습니다'를 실패처럼 돌려준다.
	장이 쉰 날에는 늘 이 응답이라 오류로 세면 주말마다 동기화가 실패로 찍힌다.
	빈 결과일 뿐이므로 정상으로 본다.
	"""
	code = body.get('return_code')
	if code is None:
		return None
	if str(code) == '0':
		return None
	message = to_text(body.get('return_msg'))
	if message and NO_DATA_PATTERN.search(message):
		return None
	return message or f'조회 실패 (return_code: {code})'
