"""python -m unittest discover trade 로 실행. 외부 의존성 없음."""

import unittest

from parse import api_error_message, parse_domestic, parse_overseas, to_number


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


class ApiErrorMessageTest(unittest.TestCase):
	def test_ok(self):
		self.assertIsNone(api_error_message({'return_code': 0}))
		self.assertIsNone(api_error_message({'return_code': '0'}))
		self.assertIsNone(api_error_message({}))

	def test_error(self):
		self.assertEqual(
			api_error_message({'return_code': 3, 'return_msg': '토큰이 유효하지 않습니다'}),
			'토큰이 유효하지 않습니다',
		)
		self.assertIn('3', api_error_message({'return_code': 3}))


if __name__ == '__main__':
	unittest.main()
