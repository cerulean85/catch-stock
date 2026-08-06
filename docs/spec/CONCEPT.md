# CONCEPT

## 한 줄 요약

S&P 500 종목 중, **월(month) RSI14가 70 이상**이면서 **일 RSI14가 연속 3일간 상승 추세**인 종목을 발굴하여 Grid로 보여주는 서비스.

## 발굴 조건

- 대상 유니버스: S&P 500 구성 종목
- 기준 시각: 사용자가 화면을 열거나 새로고침한 시점(=서버가 응답하는 시점)
- 필터:
  - `monthlyRSI14 ≥ 70`
  - `일 RSI14 연속 3일 상승 추세`: 최근 3거래일의 dailyRSI14가 모두 전날 대비 상승
- RSI 산식: Wilder의 SMMA(지수가중) 방식 RSI14, 종가 기준

## 출력

- 조건을 만족하는 종목을 표(Grid) 형태로 노출
- 결과가 0개일 수 있음(빈 상태 UI 필요)

## 상세 사양

- 스크리너: [./screener.md](./screener.md)
- 인증/계정: [./auth.md](./auth.md)
- 데이터 모델: [./data-model.md](./data-model.md)
- 테마(라이트/다크): [./theme.md](./theme.md)
- 약관/개인정보: [./legal.md](./legal.md)
