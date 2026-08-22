"""python -m unittest discover trade 로 실행. 외부 의존성 없음."""

import unittest

from parse import (
	SIDE_BUY,
	SIDE_SELL,
	api_error_message,
	normalize_side,
	parse_domestic,
	parse_domestic_trades,
	parse_overseas,
	parse_overseas_trades,
	to_number,
)


class ToNumberTest(unittest.TestCase):
	def test_signed_zero_padded(self):
		self.assertEqual(to_number('+000000012345'), 12345)
		self.assertEqual(to_number('-0000000500'), -500)
		self.assertAlmostEqual(to_number('+12.34'), 12.34)

	def test_falls_back_to_zero(self):
		for value in ['', '   ', None, 'abc', {}]:
			self.assertEqual(to_number(value), 0.0)


class ParseDomesticTest(unittest.TestCase):
	def test_maps_holdings(self):
		rows = parse_domestic({
			'stk_acnt_evlt_prst': [{
				'stk_cd': '005930',
				'stk_nm': '삼성전자',
				'rmnd_qty': '000000010',
				'avg_prc': '000070000',
				'cur_prc': '000075000',
				'evlt_amt': '000750000',
				'pl_amt': '+00050000',
				'pl_rt': '+7.14',
			}]
		})

		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]['code'], '005930')
		self.assertEqual(rows[0]['quantity'], 10)
		self.assertEqual(rows[0]['eval_amount'], 750000)
		self.assertEqual(rows[0]['currency'], 'KRW')
		self.assertIsNone(rows[0]['eval_amount_krw'])

	def test_missing_or_empty(self):
		self.assertEqual(parse_domestic({}), [])
		self.assertEqual(parse_domestic({'stk_acnt_evlt_prst': None}), [])
		# 종목코드가 없는 행은 PK를 만들 수 없어 버린다.
		self.assertEqual(parse_domestic({'stk_acnt_evlt_prst': [{'stk_nm': '이름만'}]}), [])


class ParseOverseasTest(unittest.TestCase):
	def test_maps_holdings(self):
		rows = parse_overseas({
			'result_list': [{
				'stk_cd': 'AAPL',
				'frgn_stk_nm': 'APPLE INC',
				'crnc_code': 'USD',
				'poss_qty': '5',
				'frgn_stk_book_uv': '180.25',
				'now_pric': '200.10',
				'evlt_amt': '1000.50',
				'pl_amt': '99.25',
				'pl_rt': '+11.01',
				'evlt_amt_krw': '1350000.0',
			}]
		})

		self.assertEqual(rows[0]['name'], 'APPLE INC')
		self.assertAlmostEqual(rows[0]['avg_price'], 180.25)
		self.assertEqual(rows[0]['eval_amount_krw'], 1350000)

	def test_defaults(self):
		rows = parse_overseas({'result_list': [{'stk_cd': 'TSLA', 'frgn_stk_nm': '', 'crnc_code': ''}]})
		self.assertEqual(rows[0]['name'], 'TSLA')
		self.assertEqual(rows[0]['currency'], 'USD')


class NormalizeSideTest(unittest.TestCase):
	def test_reads_direction_from_text(self):
		self.assertEqual(normalize_side('현금매수'), SIDE_BUY)
		self.assertEqual(normalize_side('해외주식매도'), SIDE_SELL)
		self.assertEqual(normalize_side('매도정정'), SIDE_SELL)

	def test_falls_back_when_ambiguous(self):
		# 실제 해외 응답의 deal_kind_nm은 매수·매도 모두 '매매'로 온다.
		self.assertEqual(normalize_side('매매', fallback=SIDE_SELL), SIDE_SELL)
		self.assertEqual(normalize_side('', fallback=SIDE_BUY), SIDE_BUY)
		self.assertEqual(normalize_side(None), 'other')


class ParseDomesticTradesTest(unittest.TestCase):
	def test_maps_fills(self):
		rows = parse_domestic_trades({
			'acnt_ord_cntr_prps_dtl': [{
				'ord_no': '0001234',
				'stk_cd': 'A005930',
				'stk_nm': '삼성전자',
				'io_tp_nm': '현금매수',
				'cntr_qty': '000000010',
				'cntr_uv': '000070000',
				'ord_tm': '09:15:32',
			}]
		}, '2026-08-07', SIDE_BUY)

		self.assertEqual(len(rows), 1)
		# 종목번호 접두어(A)를 떼야 잔고의 종목코드와 맞는다.
		self.assertEqual(rows[0]['code'], '005930')
		self.assertEqual(rows[0]['side'], SIDE_BUY)
		self.assertEqual(rows[0]['side_label'], '현금매수')
		self.assertEqual(rows[0]['quantity'], 10)
		self.assertEqual(rows[0]['amount'], 700000)
		self.assertEqual(rows[0]['traded_on'], '2026-08-07')
		self.assertEqual(rows[0]['traded_time'], '09:15:32')

	def test_skips_unfilled_orders(self):
		# 체결수량 0(미체결)과 주문번호 없는 행은 버린다.
		rows = parse_domestic_trades({
			'acnt_ord_cntr_prps_dtl': [
				{'ord_no': '0001', 'stk_cd': 'A005930', 'cntr_qty': '0'},
				{'stk_cd': 'A005930', 'cntr_qty': '10'},
			]
		}, '2026-08-07', SIDE_BUY)
		self.assertEqual(rows, [])

	def test_missing_list(self):
		self.assertEqual(parse_domestic_trades({}, '2026-08-07', SIDE_BUY), [])


class ParseOverseasTradesTest(unittest.TestCase):
	def test_maps_fills(self):
		rows = parse_overseas_trades({
			'result_list': [{
				'deal_no': '000000123',
				'deal_dt': '20260806',
				'stk_cd': 'AAPL',
				'stk_nm': 'APPLE INC',
				'deal_kind_nm': '매수',
				'deal_qty': '5',
				'uv_exrt': '180.25',
				'fc_deal_amt': '901.25',
				'fc_cmsn': '0.9',
			}]
		}, SIDE_BUY)

		self.assertEqual(rows[0]['traded_on'], '2026-08-06')
		self.assertEqual(rows[0]['code'], 'AAPL')
		self.assertAlmostEqual(rows[0]['amount'], 901.25)
		self.assertAlmostEqual(rows[0]['fee'], 0.9)
		self.assertEqual(rows[0]['currency'], 'USD')
		self.assertEqual(rows[0]['side'], SIDE_BUY)

	def test_skips_cash_rows(self):
		# 입출금 등 종목코드 없는 행은 매매내역이 아니다.
		rows = parse_overseas_trades({
			'result_list': [{'deal_no': '1', 'deal_dt': '20260806', 'stk_cd': '', 'rmrk_nm': '외화입금'}]
		}, SIDE_BUY)
		self.assertEqual(rows, [])


class ApiErrorMessageTest(unittest.TestCase):
	def test_ok(self):
		self.assertIsNone(api_error_message({'return_code': 0}))
		self.assertIsNone(api_error_message({'return_code': '0'}))
		self.assertIsNone(api_error_message({}))

	def test_no_data_is_not_an_error(self):
		# 장이 쉰 날 해외 체결을 물으면 오는 응답이다. 빈 결과일 뿐 실패가 아니다.
		self.assertIsNone(
			api_error_message({'return_code': 2000, 'return_msg': '501724:관련자료가 없습니다'})
		)
		self.assertIsNone(
			api_error_message({'return_code': 2000, 'return_msg': '조회할 자료가 없습니다.'})
		)

	def test_error(self):
		self.assertEqual(
			api_error_message({'return_code': 3, 'return_msg': '토큰이 유효하지 않습니다'}),
			'토큰이 유효하지 않습니다',
		)
		self.assertIn('3', api_error_message({'return_code': 3}))
		# 같은 2000이라도 자료 없음이 아니면 그대로 오류다.
		self.assertEqual(
			api_error_message({'return_code': 2000, 'return_msg': '일시적으로 처리할 수 없습니다'}),
			'일시적으로 처리할 수 없습니다',
		)


if __name__ == '__main__':
	unittest.main()
