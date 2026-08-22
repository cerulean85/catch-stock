# Macro Metrics Spec

`docs/metrics.pdf`의 거시 지표 체크리스트를 데이터·판정 기준까지 붙여 구조화한 문서.
구현 상수는 `src/features/macro/model/catalog.ts`이고, 두 파일은 `catalog.test.ts`로 묶여 있다.

## 1. 목적

PDF는 "무엇을 봐야 하는가"까지만 정한다. 이 문서가 더하는 것은 세 가지다.

1. **어디서 받는가** — 지표마다 무료 데이터 소스와 시리즈 ID를 지정한다.
2. **어떻게 판정하는가** — `watch` 필드에 값의 방향이 무슨 뜻인지 적는다. PDF에 없는 부분이고, 대시보드 신호등의 근거가 된다.
3. **무엇과 맞물리는가** — `linkedTo`로 지표 간 연결을 명시한다. PDF 결론("톱니바퀴처럼 맞물려")을 데이터 구조로 옮긴 것.

## 2. 분류

PDF의 6분류를 그대로 쓴다. 배열 순서 = 문서 순서 = 화면 순서.

| id             | 이름               | PDF 절                          |
| -------------- | ------------------ | ------------------------------- |
| `real-economy` | 실물 경제          | 1. 실물 경제 및 거시 경제 지표  |
| `policy`       | 통화·재정 정책     | 2. 중앙은행과 정부의 정책 동향  |
| `liquidity`    | 시중 유동성        | 3. 시중 유동성과 자본 흐름      |
| `bond`         | 채권·금리 스프레드 | 4. 채권 시장과 금리 스프레드    |
| `trade-fx`     | 무역·환율          | 5. 글로벌 무역 및 환율 변수     |
| `geopolitics`  | 지정학·산업        | 6. 지정학적 변수 및 산업 트렌드 |

## 3. 데이터 소스

지표 81개. 2026-08-23에 전부 실호출로 확인했다. 결과는 7절.

| source     | 인증                          | 개수 | 비고                                                   |
| ---------- | ----------------------------- | ---- | ------------------------------------------------------ |
| `fred`     | API 키 (`FRED_API_KEY`, 무료) | 60   | 거시 계열 전반과 발표 일정                             |
| `yahoo`    | 불필요                        | 10   | 국채 금리·유가·환율·연방기금 선물처럼 지연이 곤란한 값 |
| `treasury` | 불필요                        | 3    | Fiscal Data API — 발행·바이백·재정수지                 |
| `nyfed`    | 불필요                        | 1    | Markets API — 프라이머리 딜러 포지션                   |
| `manual`   | —                             | 7    | 공개 API가 없어 사람이 확인하고 기록한다               |

## 4. 지표 카탈로그

### 4.1 실물 경제 (`real-economy`)

44개.

| id                      | 지표                       | 소스   | 시리즈               | 변환  | 주기 |
| ----------------------- | -------------------------- | ------ | -------------------- | ----- | ---- |
| `gdp`                   | 실질 GDP                   | fred   | `GDPC1`              | yoy   | 분기 |
| `indpro`                | 산업생산                   | fred   | `INDPRO`             | yoy   | 월   |
| `tcu`                   | 설비가동률                 | fred   | `TCU`                | level | 월   |
| `cfnai`                 | 시카고 연준 활동지수       | fred   | `CFNAI`              | level | 월   |
| `durable-orders`        | 내구재 주문                | fred   | `DGORDER`            | yoy   | 월   |
| `construction`          | 건설지출                   | fred   | `TTLCONS`            | yoy   | 월   |
| `inventories`           | 기업 재고                  | fred   | `BUSINV`             | yoy   | 월   |
| `empire-fed`            | 엠파이어 제조업 서베이     | fred   | `GACDISA066MSFRBNY`  | level | 월   |
| `philly-fed`            | 필라델피아 제조업 서베이   | fred   | `GACDFSA066MSFRBPHI` | level | 월   |
| `payrolls`              | 비농업 고용                | fred   | `PAYEMS`             | diff  | 월   |
| `unemployment`          | 실업률                     | fred   | `UNRATE`             | level | 월   |
| `u6`                    | 광의 실업률(U-6)           | fred   | `U6RATE`             | level | 월   |
| `participation`         | 경제활동참가율             | fred   | `CIVPART`            | level | 월   |
| `claims`                | 신규 실업수당 청구         | fred   | `ICSA`               | level | 주   |
| `continued-claims`      | 계속 실업수당 청구         | fred   | `CCSA`               | level | 주   |
| `job-openings`          | 구인 건수                  | fred   | `JTSJOL`             | level | 월   |
| `quits`                 | 자발적 이직률              | fred   | `JTSQUR`             | level | 월   |
| `layoffs`               | 해고 건수                  | fred   | `JTSLDL`             | level | 월   |
| `work-hours`            | 주당 근로시간              | fred   | `AWHAETP`            | level | 월   |
| `wages`                 | 시간당 임금                | fred   | `CES0500000003`      | yoy   | 월   |
| `outlook`               | IMF·월드뱅크 경제전망      | manual | —                    | level | 분기 |
| `cpi`                   | CPI                        | fred   | `CPIAUCSL`           | yoy   | 월   |
| `core-cpi`              | 근원 CPI                   | fred   | `CPILFESL`           | yoy   | 월   |
| `core-pce`              | 근원 PCE                   | fred   | `PCEPILFE`           | yoy   | 월   |
| `ppi`                   | PPI(최종수요)              | fred   | `PPIFIS`             | yoy   | 월   |
| `cpi-food`              | 식료품 물가(밥상 물가)     | fred   | `CPIUFDSL`           | yoy   | 월   |
| `shelter-cpi`           | 주거비 물가                | fred   | `CPIHOSSL`           | yoy   | 월   |
| `inflation-expect-1y`   | 기대 인플레이션 1년(가계)  | fred   | `MICH`               | level | 월   |
| `inflation-expect-5y`   | 기대 인플레이션 5년        | fred   | `T5YIE`              | level | 일   |
| `inflation-expect-10y`  | 기대 인플레이션 10년       | fred   | `T10YIE`             | level | 일   |
| `inflation-expect-5y5y` | 기대 인플레이션 5년 후 5년 | fred   | `T5YIFR`             | level | 일   |
| `retail-sales`          | 소매판매                   | fred   | `RSAFS`              | yoy   | 월   |
| `real-consumption`      | 실질 소비지출              | fred   | `PCEC96`             | yoy   | 월   |
| `real-income`           | 실질 가처분소득            | fred   | `DSPIC96`            | yoy   | 월   |
| `savings-rate`          | 저축률                     | fred   | `PSAVERT`            | level | 월   |
| `revolving-credit`      | 신용카드 대출 잔액         | fred   | `REVOLSL`            | yoy   | 월   |
| `vehicle-sales`         | 자동차 판매                | fred   | `TOTALSA`            | level | 월   |
| `sentiment`             | 소비자 심리                | fred   | `UMCSENT`            | level | 월   |
| `houst`                 | 주택 착공                  | fred   | `HOUST`              | level | 월   |
| `permit`                | 건축 허가                  | fred   | `PERMIT`             | level | 월   |
| `new-home-sales`        | 신규 주택 판매             | fred   | `HSN1F`              | level | 월   |
| `existing-home-sales`   | 기존 주택 판매             | fred   | `EXHOSLUSM495S`      | level | 월   |
| `home-prices`           | 주택 가격(케이스-실러)     | fred   | `CSUSHPINSA`         | yoy   | 월   |
| `mortgage-rate`         | 30년 주택담보대출 금리     | fred   | `MORTGAGE30US`       | level | 주   |

### 4.2 통화·재정 정책 (`policy`)

8개.

| id               | 지표                     | 소스     | 시리즈                                 | 변환  | 주기 |
| ---------------- | ------------------------ | -------- | -------------------------------------- | ----- | ---- |
| `effr`           | 실효 연방기금금리        | fred     | `EFFR`                                 | level | 일   |
| `fedwatch`       | 연방기금 선물 내재 금리  | yahoo    | `ZQ=F`                                 | level | 일   |
| `fed-balance`    | 연준 총자산              | fred     | `WALCL`                                | level | 주   |
| `reserves`       | 지급준비금 잔고          | fred     | `WRESBAL`                              | level | 주   |
| `tga`            | TGA(재무부 일반계좌)     | fred     | `WTREGEN`                              | level | 주   |
| `bill-share`     | 국채 발행 중 단기채 비중 | treasury | `v1/accounting/od/auctions_query`      | level | 일   |
| `buyback`        | 국채 바이백              | treasury | `v1/accounting/od/buybacks_operations` | level | 주   |
| `fiscal-balance` | 연방 재정수지            | treasury | `v1/accounting/mts/mts_table_1`        | level | 월   |

### 4.3 시중 유동성 (`liquidity`)

7개.

| id                     | 지표                        | 소스   | 시리즈         | 변환  | 주기 |
| ---------------------- | --------------------------- | ------ | -------------- | ----- | ---- |
| `m1`                   | M1(협의통화)                | fred   | `M1SL`         | yoy   | 월   |
| `m2`                   | M2(광의통화)                | fred   | `M2SL`         | yoy   | 월   |
| `rrp`                  | 연준 역레포(RRP) 잔고       | fred   | `RRPONTSYD`    | level | 일   |
| `dealer-capacity`      | 프라이머리 딜러 보유 포지션 | nyfed  | `PDPOSGST-TOT` | level | 주   |
| `financial-conditions` | 금융 여건 지수              | fred   | `NFCI`         | level | 주   |
| `financial-stress`     | 금융 스트레스 지수          | fred   | `STLFSI4`      | level | 주   |
| `mmf`                  | MMF 잔고                    | manual | —              | level | 주   |

### 4.4 채권·금리 스프레드 (`bond`)

10개.

| id       | 지표                 | 소스  | 시리즈         | 변환  | 주기 |
| -------- | -------------------- | ----- | -------------- | ----- | ---- |
| `dgs3m`  | 미 국채 3개월        | yahoo | `^IRX`         | level | 일   |
| `dgs2`   | 미 국채 2년          | fred  | `DGS2`         | level | 일   |
| `dgs5`   | 미 국채 5년          | yahoo | `^FVX`         | level | 일   |
| `dgs10`  | 미 국채 10년         | yahoo | `^TNX`         | level | 일   |
| `dgs30`  | 미 국채 30년         | yahoo | `^TYX`         | level | 일   |
| `t10y2y` | 10년-2년 금리차      | fred  | `T10Y2Y`       | level | 일   |
| `t10y3m` | 10년-3개월 금리차    | fred  | `T10Y3M`       | level | 일   |
| `hy-oas` | 하이일드 가산금리    | fred  | `BAMLH0A0HYM2` | level | 일   |
| `ig-oas` | 우량 회사채 가산금리 | fred  | `BAMLC0A0CM`   | level | 일   |
| `capex`  | 핵심 자본재 수주     | fred  | `NEWORDER`     | yoy   | 월   |

### 4.5 무역·환율 (`trade-fx`)

6개.

| id              | 지표             | 소스   | 시리즈     | 변환  | 주기 |
| --------------- | ---------------- | ------ | ---------- | ----- | ---- |
| `ai-exports`    | AI 밸류체인 수출 | manual | —          | yoy   | 월   |
| `dxy`           | 달러 인덱스(DXY) | yahoo  | `DX-Y.NYB` | level | 일   |
| `usdjpy`        | 달러/엔          | yahoo  | `JPY=X`    | level | 일   |
| `usdkrw`        | 달러/원          | yahoo  | `KRW=X`    | level | 일   |
| `trade-balance` | 무역수지         | fred   | `BOPGSTB`  | level | 월   |
| `net-exports`   | 순수출(GDP 기여) | fred   | `NETEXP`   | level | 분기 |

### 4.6 지정학·산업 (`geopolitics`)

6개.

| id           | 지표                     | 소스   | 시리즈 | 변환  | 주기 |
| ------------ | ------------------------ | ------ | ------ | ----- | ---- |
| `geo-risk`   | 지정학 리스크            | manual | —      | level | 일   |
| `politics`   | 행정부 정책·선거 변수    | manual | —      | level | 일   |
| `stablecoin` | 스테이블코인 단기채 매입 | manual | —      | level | 월   |
| `power`      | 전력 공급·발전 설비      | manual | —      | level | 월   |
| `wti`        | WTI 유가                 | yahoo  | `CL=F` | level | 일   |
| `brent`      | 브렌트 유가              | yahoo  | `BZ=F` | level | 일   |

각 지표의 판정 기준(`watch`)과 연결(`linkedTo`)은 `catalog.ts`에 지표별로 적혀 있다.
문서에 중복해 적으면 반드시 어긋나므로 여기에는 옮기지 않는다.

## 5. 파생 지표 (톱니바퀴)

PDF 결론이 요구하는 "연결 짓기"를 계산식으로 고정한 것. 개별 수치보다 이쪽을 먼저 본다.

| id              | 계산                                    | 뜻                                                                                 |
| --------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| `net-liquidity` | `WALCL/1000 − WTREGEN/1000 − RRPONTSYD` | 연준이 푼 돈에서 재무부·역레포가 묶어둔 몫을 뺀 값. 위험자산에 실제로 닿는 유동성. |
| `m1-m2-ratio`   | `M1SL / M2SL`                           | 하락 = 자금이 고금리 예금·MMF로 얼어붙어 자산시장 유동성이 마름.                   |

> **단위 주의**: `WALCL`·`WTREGEN`은 백만 달러, `RRPONTSYD`는 십억 달러로 내려온다.
> 정규화 없이 그대로 빼면 순유동성이 실제의 1000배 가까이 어긋난다. 2026-08-23 기준
> 정상 계산값은 6.75조 − 0.95조 − 0.0002조 = **약 5.79조 달러**.

PDF가 예로 든 "단기채 발행 → 딜러 장부 → 유동성" 경로는 `bill-share → dealer-capacity → rrp`
연결로 표현되어 있고, 값 하나로 합치지 않는다. 방향이 상황마다 달라 단일 수식으로 굳히면 틀린다.

역전이 풀리는 방식(불/베어 스티프닝)도 처음에는 파생 지표로 뒀다가 뺐다. 20일 변화의
부호 조합만으로는 성격을 잘못 부르는 경우가 많아, 판단 기준을 `t10y2y`의 `watch` 문장으로
남기고 2년·10년 금리는 각 카드에서 따로 본다.

## 6. 국면 판정

PDF 1번의 "확장·둔화·침체·회복 중 어디인가"를 두 축으로 좁힌다.

- **물가 축**: `core-pce` 최근 3개월 상승률(연율)이 그 직전 3개월보다 높으면 가속, 낮으면 둔화
- **고용 축**: 실업률과 고용 증가폭 **두 신호를 대등하게** 보고 합친다

| 물가 | 고용 | 국면 | 무엇에 집중하는가 (PDF 1번)  |
| ---- | ---- | ---- | ---------------------------- |
| 가속 | 개선 | 확장 | 물가·금리 인상               |
| 가속 | 악화 | 둔화 | 물가와 고용 사이의 연준 선택 |
| 둔화 | 악화 | 침체 | 고용·금리 인하               |
| 둔화 | 개선 | 회복 | 유동성·위험선호              |

### 6.1 고용 축을 두 신호로 보는 이유

실업률과 고용 증가폭이 정반대를 가리키는 구간이 실제로 자주 나온다.
2026-08 기준이 그랬다 — 실업률은 4.1%로 12개월 최저(삼 룰 갭 0.00%p)인데
월평균 고용 증가는 2.0만 명이었다. 증가폭 하나로 단정하면 GDP가 +1.5%인 상황에서
"침체"가 찍힌다. 국면 이름이 실제보다 세게 붙는 것이다.

| 신호                    | 개선     | 악화       | 중립    |
| ----------------------- | -------- | ---------- | ------- |
| 실업률(삼 룰 갭)        | ≤ +0.1%p | ≥ +0.5%p   | 그 사이 |
| 월평균 고용 증가(3개월) | ≥ 5만 명 | ≤ 2.5만 명 | 그 사이 |

- 두 신호가 같은 방향이면 그 방향으로 간다.
- 한쪽이 중립이면 나머지를 따른다.
- **정반대면 판정을 보류한다.** 4분면에는 물가 축만 정해진 후보 두 칸을 함께 표시하고,
  요약에는 "엇갈림"이라고 적는다.

고용 손익분기를 흔히 쓰는 10만 명이 아니라 **5만 명**으로 둔 이유는, 이민 유입이 줄면서
인구 증가를 흡수하는 데 필요한 고용이 그만큼 낮아졌기 때문이다. 실업률이 오르지 않는 것이
그 방증이다. 월별 진폭이 커서 3개월 평균과 6개월 평균을 함께 보여 준다.

`outlook`(IMF·월드뱅크)은 이 판정과 대조하는 외부 기준으로만 쓴다.

## 7. 소스 검증 결과 (2026-08-23)

43개 지표를 전부 실제로 호출해 확인했다. 아래는 그 과정에서 카탈로그를 고친 내용이다.

### 7.1 확인된 것

- **FRED 29개 전부 존재** — 의심했던 `PPIFIS`, `CPIUFDSL`, `RSAFS`, `NEWORDER`, `WRESBAL`,
  `DTWEXBGS` 포함. 주기와 단위는 4절 표에 실측값으로 반영했다.
- **Treasury Fiscal Data 3개 모두 열림** (키 불필요)
  - `auctions_query` — `security_type`(Bill/Note/Bond)과 `offering_amt`로 `bill-share`를
    직접 계산할 수 있다. 최근 200건 기준 **Bill 85.1% / Note 13.3% / Bond 1.6%**.
  - `buybacks_operations` — 날짜 필드가 `record_date`가 아니라 **`operation_date`**다.
    정렬은 `sort=-operation_date`. 금액은 `total_par_amt_accepted`.
  - `mts_table_1` — 월간 재정수지.
- **NY Fed Markets API** — 계열 키는 **`PDPOSGST-TOT`**(TIPS 제외 국채 순포지션, 주간, 백만 달러).
  `api/pd/get/PDPOSGST-TOT.json`으로 전체 이력(698건)이 한 번에 온다.
- **Yahoo** — `CL=F`, `BZ=F`, `DX-Y.NYB`, `JPY=X`, `KRW=X`, `ZQ=F` 모두 정상.

### 7.2 고친 것

| 지표                    | 무엇이 틀렸나                                         | 고친 값        |
| ----------------------- | ----------------------------------------------------- | -------------- |
| `tga`                   | `WTREGEN`은 십억이 아니라 **백만 달러**               | 단위 수정      |
| `buyback`               | 금액이 원단위 달러로 내려온다                         | 단위 → 달러    |
| `fiscal-balance`        | 위와 같음                                             | 단위 → 달러    |
| `dealer-capacity`       | 엔드포인트를 계열 키로 잘못 적어둠                    | `PDPOSGST-TOT` |
| `dxy`·`usdjpy`·`usdkrw` | FRED H.10 환율은 발표가 **9일 지연**(관측 종료 08-14) | 소스를 yahoo로 |
| `fedwatch`              | 수동으로 두려 했으나 자동화 가능                      | 소스를 yahoo로 |
| `net-liquidity`         | 세 계열의 단위가 섞여 있음                            | 정규화 명시    |

### 7.3 `fedwatch` 자동화 방식

`ZQ=F`(최근월)와 이월물 `ZQ{월코드}{연}.CBT`(예: `ZQZ26.CBT`)가 모두 조회된다.
`100 − 가격`이 해당 월의 내재 평균 정책금리다. 2026-08-23 확인값:

| 계약               | 가격   | 내재 금리 |
| ------------------ | ------ | --------- |
| `ZQ=F` (10월)      | 96.265 | 3.735%    |
| `ZQX26.CBT` (11월) | 96.215 | 3.785%    |
| `ZQZ26.CBT` (12월) | 96.140 | 3.860%    |

CME FedWatch의 인하·동결 **확률**은 FOMC 회의일 기준 월중 가중이 필요해 이 방식으로는
그대로 못 뽑는다. 대신 **월별 내재 금리 곡선**을 그리고, 확률 자체는 `href`의 CME 페이지로
교차 확인한다.

### 7.4 일간 지표의 최신성 (2026-08-23 조사)

FRED의 `observation_end`로 확인한 결과, 늦는 것은 우리 쪽 캐시가 아니라 FRED의 발표다.

| 계열                                              | FRED 최종 관측일 | 판정         |
| ------------------------------------------------- | ---------------- | ------------ |
| `T10Y2Y`·`T10Y3M`·`RRPONTSYD`                     | 08-21(금)        | 최신         |
| `DGS2`·`DGS10`·`EFFR`·`BAMLH0A0HYM2`·`BAMLC0A0CM` | 08-20(목)        | 1영업일 지연 |
| `DTWEXBGS`                                        | 08-14(금)        | 9일 지연     |

그래서 라이브 시세가 있는 것은 야후로 옮겼다. 국채 금리는 CBOE 지수(`^IRX`·`^FVX`·`^TNX`·`^TYX`)가
금요일 종가까지 들어온다. **2년물만 라이브 지수가 없어 FRED를 계속 쓰며, 다른 만기보다 하루 늦다.**
가산금리(ICE BofA OAS)도 무료 라이브 소스가 없어 1영업일 지연을 안고 간다.

`2YY=F`는 쓰지 않는다. 만기가 지난 7월물이 물려 있어(`regularMarketTime` 2026-07-15)
5주 묵은 값을 실시간처럼 돌려준다. 상단 시세 바가 이 심볼을 US 2Y로 쓰고 있어 별도 확인이 필요하다.

### 7.5 국채 커브를 같은 날짜로 맞추기

FRED는 `DGS2`·`DGS3MO`·`DGS10`을 하루 늦게 올리지만, 스프레드(`T10Y2Y`·`T10Y3M`)는 당일 올린다.
10년 금리를 야후(`^TNX`)에서 실시간으로 받으므로, 거기서 공식 스프레드를 빼면 2년·3개월도
같은 날짜가 된다.

```
2년   = ^TNX − T10Y2Y
3개월 = ^TNX − T10Y3M
```

스프레드의 관측일이 10년 금리와 같을 때만 이 값을 쓰고, 아니면 FRED 값을 그대로 둔다.
카드에는 산출값이라는 사실을 함께 적는다.

`^IRX`는 쓰지 않는다. 13주 국채의 **할인율**이라 다른 만기의 상수만기 수익률과 기준이 달라서,
2026-08-21 기준 3.71 대 3.88로 17bp 어긋난다. 커브를 나란히 놓고 보는 화면에서는 섞으면 안 된다.

### 7.6 남은 수동 항목 7개

`outlook`, `mmf`, `ai-exports`, `geo-risk`, `politics`, `stablecoin`, `power`.
공개 API가 없거나(ICI·CME) 정성 판단이라, 대시보드에서는 값 대신 확인처 링크와
`market-notes` 기록으로 다룬다.

## 8. 화면 (`/macro`)

`src/features/macro`, 페이지는 `src/app/macro/page.tsx`. 전부 서버 컴포넌트다.

위에서부터 네 단이다.

1. **경기 국면 4분면** — 6절 규칙으로 현재 칸을 칠하고, 판정 근거와 기준선을 아래에 남긴다.
2. **파생 지표** — 5절의 순유동성과 M1/M2 비율. 계산 근거를 한 줄로 같이 보여준다.
3. **다가오는 발표** — 아래 캘린더.
4. **6분류 카드** — 2절 순서 그대로. 카드마다 현재값·변화·추세선·기준일·신선도와
   그 지표의 `watch` 문장을 함께 둔다.

### 8.1 경제 캘린더

FRED는 통계별 발표 일정을 릴리스 단위로 미리 공개한다(`fred/release/dates`,
`include_release_dates_with_no_data=true`를 켜야 앞날의 일정이 나온다).
`model/calendar.ts`에 고른 릴리스만 조회하고, 릴리스마다 가장 가까운 한 건씩만 남긴다.
각 일정에는 그날 갱신되는 카탈로그 지표를 함께 적는다.

FOMC(릴리스 101)는 뺐다. 날짜가 하루 단위로 채워져 나와 일정으로 쓸 수 없다.

### 8.2 발표 시각

FRED는 날짜만 주므로 기관별 발표 시각(미 동부 기준)을 `MACRO_RELEASES`에 적어 둔다.
BLS·BEA·Census는 08:30, 연준 산업생산은 09:15, JOLTS·기존주택판매·미시간대는 10:00이다.
서머타임 때문에 UTC 오프셋이 −4시간과 −5시간으로 갈리므로 고정값을 쓰지 않고
`easternToInstant`가 그 날짜의 실제 오프셋을 구해 절대 시각으로 옮긴다.
화면에는 미 동부와 한국 시각을 함께 적고, 한국 날짜가 넘어가면 (익일)을 붙인다.

### 8.3 출처 링크

카드마다 숫자를 대조할 수 있는 원본 링크를 건다 — FRED 시리즈 페이지, 야후 심볼 페이지,
재무부 데이터셋, 뉴욕 연준 통계 페이지. 널리 쓰이는 지표는 해설 링크를 하나 더 붙인다.

### 8.4 신선도 표시

`model/freshness.ts`가 기준일을 발표 주기에 견줘 판정한다.

- 일간: 영업일로 세고, 1영업일 지연까지는 정상. 주말에는 금요일 자료가 곧 최신이다.
- 주간: 16일이 넘으면 늦은 것으로 본다. 계속 실업수당처럼 한 주 더 밀려 나오는 계열이 있다.
- 월간·분기: 관측 기간의 첫날로 날짜가 찍혀 늘 한두 달 지난 것처럼 보인다. 늦었다고 판정하지 않고
  "2026년 7월분"처럼 기간 이름으로 적은 뒤, 캘린더에서 가져온 **다음 발표일**을 함께 보여준다.

늦은 카드는 기준일 줄을 강조하고, 상단에 늦은 지표 개수를 함께 적는다.

### 8.5 정한 것

- **신호등을 쓰지 않는다.** `watch`는 문장이라 기계가 임계값으로 읽을 수 없다.
  색으로 자동 판정하면 없는 기준을 지어내는 셈이라, 숫자 옆에 기준 문장을 나란히 두고
  판단은 사람이 한다.
- **한 소스가 죽어도 화면은 뜬다.** 실패한 지표는 카드에 이유가 남고 나머지는 그대로 그린다.
- **추세선은 변환을 거친 값으로 그린다.** 지수를 원계열 그대로 그리면 우상향 직선만 보인다.

## 9. 관련 문서

- `docs/metrics.pdf` — 원문
- `docs/spec/inv-stds-integration.md` — `shared/lib/fred.ts`를 스코어링용으로 계획해 둔 문서.
  FRED 클라이언트는 이 매크로 기능과 **공용으로 하나만** 만든다.
