"""exchange.py 및 schedule_helper.py 단위 테스트.

실제 키움 API 호출이나 금융 거래를 일절 발생시키지 않는 순수 모의(Mock) 단위 테스트입니다.
실행 방법:
    python3 -m unittest trade/test_exchange.py
"""

import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from kakao import send_exchange_notification

from parse import (
	parse_exchange_estimate,
	parse_exchange_result,
	parse_realized_profit,
)
from schedule_helper import (
	get_exchange_target_date,
	get_previous_target_date,
	is_business_day,
	is_exchange_day,
	is_holiday,
)
from exchange import run_exchange


class ScheduleHelperTest(unittest.TestCase):
	def test_21st_on_weekday(self):
		# 2026-01-21은 수요일 (정상 평일)
		target = get_exchange_target_date(2026, 1)
		self.assertEqual(target, date(2026, 1, 21))
		self.assertTrue(is_exchange_day(date(2026, 1, 21)))
		self.assertFalse(is_exchange_day(date(2026, 1, 20)))

	def test_21st_on_saturday_adjusts_to_friday(self):
		# 2026-02-21은 토요일 -> 직전 금요일인 2026-02-20으로 조정
		target = get_exchange_target_date(2026, 2)
		self.assertEqual(target, date(2026, 2, 20))
		self.assertTrue(is_exchange_day(date(2026, 2, 20)))
		self.assertFalse(is_exchange_day(date(2026, 2, 21)))

	def test_21st_on_sunday_adjusts_to_friday(self):
		# 2026-06-21은 일요일 -> 직전 금요일인 2026-06-19로 조정
		target = get_exchange_target_date(2026, 6)
		self.assertEqual(target, date(2026, 6, 19))
		self.assertTrue(is_exchange_day(date(2026, 6, 19)))

	def test_21st_on_chuseok_holiday(self):
		# 2029-09-21은 추석 연휴(금요일) -> 직전 목요일인 2029-09-20으로 조정
		target = get_exchange_target_date(2029, 9)
		self.assertEqual(target, date(2029, 9, 20))

	def test_previous_target_date_rollover(self):
		# 1월의 직전 환전일은 전년도 12월
		prev = get_previous_target_date(2026, 1)
		self.assertEqual(prev.year, 2025)
		self.assertEqual(prev.month, 12)
		self.assertTrue(is_business_day(prev))


class ExchangeParsingTest(unittest.TestCase):
	def test_parse_realized_profit(self):
		body = {
			'tot_pl_amt': '+0000001500.50',
			'tot_sell_amt': '10000.00',
			'tot_buy_amt': '8490.00',
			'tot_cmsn_tax': '9.50',
		}
		data = parse_realized_profit(body)
		self.assertAlmostEqual(data['profit_usd'], 1500.50)
		self.assertAlmostEqual(data['total_sell_usd'], 10000.00)
		self.assertAlmostEqual(data['total_buy_usd'], 8490.00)
		self.assertAlmostEqual(data['total_fee_tax_usd'], 9.50)

	def test_parse_exchange_estimate(self):
		body = {
			'sell_crnc_exmn_alow_amt': '500.25',
			'aplc_exrt': '1380.50',
			'buy_expc_amt': '690595',
			'sell_expc_amt': '500.25',
		}
		data = parse_exchange_estimate(body, exch_tp='2')
		self.assertAlmostEqual(data['available_usd'], 500.25)
		self.assertAlmostEqual(data['exchange_rate'], 1380.50)
		self.assertAlmostEqual(data['expected_krw'], 690595.0)

	def test_parse_exchange_result(self):
		body = {
			'krw_exmn_amt': '000000000276100',
			'sell_fc_amt': '200.00',
			'aplc_exrt': '1380.50',
			'return_code': 0,
			'return_msg': '환전처리가 완료되었습니다.',
		}
		data = parse_exchange_result(body)
		self.assertEqual(data['received_krw'], 276100.0)
		self.assertEqual(data['sold_usd'], 200.0)
		self.assertEqual(data['exchange_rate'], 1380.50)
		self.assertEqual(data['return_msg'], '환전처리가 완료되었습니다.')


class RunExchangePipelineMockTest(unittest.TestCase):
	def setUp(self):
		self.mock_client = MagicMock()

	def test_skips_when_not_target_date(self):
		# 2026-01-10은 환전일(2026-01-21)이 아님
		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 10),
			force=False,
			dry_run=True,
		)
		self.assertEqual(res['status'], 'skipped_not_target_date')
		self.mock_client.fetch_overseas_profit.assert_not_called()

	def test_skips_when_realized_profit_is_zero_or_negative(self):
		# 실현손익이 0 이하 (-50 USD)인 경우 환전 건너뜀
		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '-0000000050.00',
			'tot_sell_amt': '1000.00',
			'tot_buy_amt': '1050.00',
			'tot_cmsn_tax': '0.00',
		}

		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			force=False,
			dry_run=True,
		)
		self.assertEqual(res['status'], 'skipped_no_profit')
		self.assertEqual(res['profit_usd'], -50.0)
		# 환전 가능 금액 조회나 환전 신청은 호출되지 않아야 함
		self.mock_client.fetch_exchange_estimate.assert_not_called()
		self.mock_client.request_exchange.assert_not_called()

	def test_skips_when_available_foreign_currency_is_zero(self):
		# 수익은 $1,000 났지만, 주식을 다시 사서 환전 가능 달러가 $0인 경우
		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '+0000001000.00',
			'tot_sell_amt': '5000.00',
			'tot_buy_amt': '4000.00',
			'tot_cmsn_tax': '0.00',
		}
		self.mock_client.fetch_exchange_estimate.return_value = {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': '0.00',
			'aplc_exrt': '1380.00',
		}

		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			force=False,
			dry_run=True,
		)
		self.assertEqual(res['status'], 'skipped_no_funds')
		self.mock_client.request_exchange.assert_not_called()

	def test_dry_run_calculates_20_percent_and_caps_by_available(self):
		# 수익 $1,000 -> 20%는 $200. 그런데 외화환전가능금액은 $150인 경우
		# $150로 캡핑되고 dry-run 모드에서는 실제 API를 호출하지 않음
		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '+0000001000.00',
			'tot_sell_amt': '5000.00',
			'tot_buy_amt': '4000.00',
			'tot_cmsn_tax': '0.00',
		}
		self.mock_client.fetch_exchange_estimate.return_value = {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': '150.00',
			'aplc_exrt': '1400.00',
			'buy_expc_amt': '210000',
		}

		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			force=False,
			dry_run=True,
			rate_pct=20.0,
		)
		self.assertEqual(res['status'], 'dry_run_success')
		self.assertEqual(res['profit_usd'], 1000.0)
		self.assertEqual(res['target_usd'], 200.0)
		self.assertEqual(res['final_usd'], 150.0)  # 캡핑됨
		self.assertEqual(res['expected_krw'], 210000)
		self.mock_client.request_exchange.assert_not_called()

	@patch('exchange.send_exchange_notification')
	def test_execute_mode_calls_request_exchange(self, mock_notify):
		mock_notify.return_value = (True, '전송 성공')
		# 수익 $1,000, 20% = $200, 가능금액 $500 -> $200 전액 환전 실행
		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '+0000001000.00',
			'tot_sell_amt': '5000.00',
			'tot_buy_amt': '4000.00',
			'tot_cmsn_tax': '0.00',
		}
		self.mock_client.fetch_exchange_estimate.return_value = {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': '500.00',
			'aplc_exrt': '1400.00',
		}
		self.mock_client.request_exchange.return_value = {
			'return_code': 0,
			'return_msg': '환전처리가 완료되었습니다.',
			'sell_fc_amt': '200.00',
			'krw_exmn_amt': '000000000280000',
			'aplc_exrt': '1400.00',
		}

		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			force=False,
			dry_run=False,  # 실제 실행 모드
			rate_pct=20.0,
			yes=True,
		)
		self.assertEqual(res['status'], 'completed')
		self.assertEqual(res['sold_usd'], 200.0)
		self.assertEqual(res['received_krw'], 280000.0)
		self.mock_client.request_exchange.assert_called_once_with(
			exch_tp='2',
			fc_exmn_amt='200.00',
		)
		mock_notify.assert_called_once_with(
			sold_usd=200.0,
			received_krw=280000.0,
			exchange_rate=1400.0,
			exchange_date=date(2026, 1, 21),
		)

	def test_custom_amount_specified(self):
		# 실현손익이 0이어도 직접 --amount 10.00을 지정하면 10달러 환전 시도
		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '0.00',
			'tot_sell_amt': '0.00',
			'tot_buy_amt': '0.00',
			'tot_cmsn_tax': '0.00',
		}
		self.mock_client.fetch_exchange_estimate.return_value = {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': '500.00',
			'aplc_exrt': '1380.00',
			'buy_expc_amt': '13800',
		}

		res = run_exchange(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			force=True,
			dry_run=True,
			amount=10.0,
		)
		self.assertEqual(res['status'], 'dry_run_success')
		self.assertEqual(res['target_usd'], 10.0)
		self.assertEqual(res['final_usd'], 10.0)

	def test_check_account_status(self):
		from exchange import check_account_status

		self.mock_client.fetch_overseas_profit.return_value = {
			'return_code': 0,
			'tot_pl_amt': '+0000001500.00',
			'tot_sell_amt': '6000.00',
			'tot_buy_amt': '4500.00',
			'tot_cmsn_tax': '5.00',
		}
		self.mock_client.fetch_exchange_estimate.return_value = {
			'return_code': 0,
			'sell_crnc_exmn_alow_amt': '700.00',
			'aplc_exrt': '1385.00',
		}
		self.mock_client.fetch_overseas.return_value = {
			'return_code': 0,
			'tot_evlt_amt': '15000.00',
			'tot_pl_amt': '1200.00',
			'tot_pl_rt': '8.70',
		}

		success = check_account_status(
			client=self.mock_client,
			ref_date=date(2026, 1, 21),
			rate_pct=20.0,
		)
		self.assertTrue(success)
		self.mock_client.request_exchange.assert_not_called()


class KakaoNotificationTest(unittest.TestCase):
	def test_notification_no_tokens(self):
		ok, msg = send_exchange_notification(
			sold_usd=100.0,
			received_krw=140000.0,
			exchange_rate=1400.0,
			access_token='',
			refresh_token_val='',
		)
		self.assertFalse(ok)
		self.assertIn('설정되지 않아', msg)

	@patch('requests.post')
	def test_notification_success(self, mock_post):
		mock_resp = MagicMock()
		mock_resp.status_code = 200
		mock_resp.json.return_value = {'result_code': 0}
		mock_post.return_value = mock_resp

		ok, msg = send_exchange_notification(
			sold_usd=100.0,
			received_krw=140000.0,
			exchange_rate=1400.0,
			access_token='test_access_token',
		)
		self.assertTrue(ok)
		self.assertIn('성공', msg)

	@patch('requests.post')
	def test_notification_token_refresh_on_401(self, mock_post):
		# 1차 전송 401 (만료) -> 토큰 갱신 200 -> 2차 전송 200 성공
		resp_401 = MagicMock(status_code=401, text='Unauthorized')
		resp_refresh = MagicMock(status_code=200)
		resp_refresh.json.return_value = {'access_token': 'new_token', 'refresh_token': 'new_refresh'}
		resp_retry = MagicMock(status_code=200)
		resp_retry.json.return_value = {'result_code': 0}

		mock_post.side_effect = [resp_401, resp_refresh, resp_retry]

		ok, msg = send_exchange_notification(
			sold_usd=100.0,
			received_krw=140000.0,
			exchange_rate=1400.0,
			access_token='expired_token',
			refresh_token_val='valid_refresh_token',
			rest_api_key='test_rest_api_key',
		)
		self.assertTrue(ok)
		self.assertIn('성공', msg)

	@patch('requests.post')
	def test_notification_api_failure(self, mock_post):
		mock_resp = MagicMock()
		mock_resp.status_code = 400
		mock_resp.text = 'Bad Request'
		mock_post.return_value = mock_resp

		ok, msg = send_exchange_notification(
			sold_usd=100.0,
			received_krw=140000.0,
			exchange_rate=1400.0,
			access_token='test_access_token',
		)
		self.assertFalse(ok)
		self.assertIn('전송 실패', msg)


if __name__ == '__main__':
	unittest.main()
