# 미국주식 수익 20% 자동 환전 명령어 가이드

> **스크립트 위치:** `trade/exchange.py`  
> **스케줄 기준:** 매월 21일 09:30 (주말/공휴일 시 직전 영업일)

---

## 📌 명령어 한눈에 보기 (치트시트)

| 구분 | 명령어 | 실제 환전 여부 | 용도 및 설명 |
| :--- | :--- | :---: | :--- |
| **조회** | `python3 exchange.py --check` | ❌ 안 됨 (안전) | 실제 계좌의 기간 실현손익, 외화예수금, 적용 환율, 20% 예상 원화 조회 |
| **조회 (기간지정)** | `python3 exchange.py --check --period-start 2026-10-01` | ❌ 안 됨 (안전) | 특정 기간 실현손익과 현재 잔고 확인 |
| **가상 조회** | `python3 exchange.py --check --simulate` | ❌ 안 됨 (안전) | IP 미등록 로컬 환경에서 가상 데이터로 조회 레이아웃 확인 |
| **모의 계산** | `python3 exchange.py --dry-run` | ❌ 안 됨 (안전) | 오늘이 21일(영업일)인 경우에만 20% 환전 계산 시뮬레이션 (기본값) |
| **강제 모의** | `python3 exchange.py --force --dry-run` | ❌ 안 됨 (안전) | 날짜 검사 건너뛰고 오늘 기준으로 20% 환전 모의 계산 |
| **금액 지정 모의** | `python3 exchange.py --force --dry-run --amount 10` | ❌ 안 됨 (안전) | 20% 계산 대신 $10를 지정하여 환율 및 입금 원화 모의 계산 |
| **가상 모의** | `python3 exchange.py --force --dry-run --simulate` | ❌ 안 됨 (안전) | 키움 API 접속 없이 가상 데이터로 파이프라인 전체 모의 실행 |
| **카톡 알림 테스트** | `python3 exchange.py --test-kakao` | ❌ 안 됨 (안전) | 카카오톡 환전 완료 알림 ("나에게 보내기") 전송 테스트 |
| **정규 실전 환전** | `python3 exchange.py --execute` | ⚠️ **21일 당일만** | 오늘이 21일(직전영업일) 당일일 때만 20% 실제 환전 실행 |
| **소액 실전 환전** | `python3 exchange.py --force --execute --amount 1` | ⚠️ **실제 환전 (확인창)** | $1 소액 실전 테스트 (터미널에 `y/N` 최종 확인창 뜸) |
| **단위 테스트** | `PYTHONPATH=trade python3 -m unittest discover -s trade -v` | ❌ 안 됨 (안전) | 35개 단위 테스트(날짜 계산, API 파싱, 환전 파이프라인, 카톡 알림) 검증 |

---

## 1. 계좌 현황 단순 조회 (`--check`)

환전이나 주문을 일절 실행하지 않고, 현재 계좌의 손익과 잔고 상태만 확인합니다.

```bash
cd trade

# 기본 조회 (직전 환전일 다음날 ~ 오늘까지의 손익 집계)
python3 exchange.py --check

# 특정 기간 지정 조회
python3 exchange.py --check --period-start 2026-10-01 --period-end 2026-10-28

# 비율 변경 시뮬레이션 (예: 30% 환전 시 얼마인지 보고 싶을 때)
python3 exchange.py --check --rate-pct 30
```

---

## 2. 모의 계산 및 테스트 (`--dry-run`, `--simulate`)

실제 키움 환전 API(`ust31302`)를 호출하지 않고 계산 로직만 점검합니다.

```bash
cd trade

# 날짜 검사를 통과시켜 오늘 기준으로 20% 환전 모의 계산
python3 exchange.py --force --dry-run

# 원하는 달러 금액($5)으로 환전 시뮬레이션
python3 exchange.py --force --dry-run --amount 5

# 특정 날짜를 가정하여 시뮬레이션 (21일이 일요일인 2026-06-21 -> 19일 금요일 자동 판별)
python3 exchange.py --date 2026-06-19 --dry-run

# 로컬 PC(공인 IP 미등록 환경)에서 가상 데이터로 테스트
python3 exchange.py --force --dry-run --simulate
```

---

## 3. 실제 환전 실행 (`--execute`)

실제 계좌의 달러가 원화로 환전되는 명령어입니다.

```bash
cd trade

# 1. 정규 모드 (매월 21일 당일에만 1회 실제 환전 실행)
#    - 오늘이 21일(직전영업일)이 아니면 자동으로 아무 작업도 하지 않고 안전하게 종료됩니다.
python3 exchange.py --execute

# 2. 소액($1) 실전 테스트
#    - 터미널에 [⚠️ 정말로 $1.00 USD를 원화로 즉시 환전하시겠습니까? (y/N)] 확인창이 뜹니다.
python3 exchange.py --force --execute --amount 1

# 3. 확인창 생략 (크론 자동화용)
python3 exchange.py --execute -y
```

---

## 4. Cron 스케줄러 등록 (완전 자동화)

매월 15~21일 평일 오전 9:30에 크론을 실행하도록 등록하면, 스크립트 내부의 [schedule_helper.py](file:///Users/zhkim/Desktop/git/catch-stock/trade/schedule_helper.py)가 휴일/영업일을 자동 판별하여 **정확히 당월 환전 대상일에만 1회 환전**을 수행합니다.

```cron
# crontab -e
30 9 15-21 * 1-5 cd /Users/zhkim/Desktop/git/catch-stock/trade && .venv/bin/python exchange.py --execute >> exchange.log 2>&1
```

> **💡 은행 송금 연계 안내**  
> 키움증권은 무인 외부 계좌 이체 API를 제공하지 않으므로, **주거래 은행 앱(토스, 카카오뱅크, 신한 등)의 '오픈뱅킹 자동 모으기/가져오기'를 매월 21일 오후로 설정**해 두시면 오전 9:30에 환전된 원화가 내 은행 계좌로 자동 입금됩니다.

---

## 5. 환전 완료 카카오톡 알림 & 영웅문S# 원터치 바로가기

환전이 완료되면 카카오톡 "나에게 보내기" 메시지로 환전 결과와 함께 영웅문S# 모바일 앱을 즉시 실행할 수 있는 버튼이 도착합니다.

### 알림 메시지 예시
```text
🔔 [CatchStock] 미국주식 수익 20% 환전 완료!

• 매도 달러: $200.00 USD
• 입금 원화: ₩280,000 KRW
• 적용 환율: 1,400.00 KRW/USD

신한은행으로 송금하시려면 아래 버튼을 눌러 영웅문S# 앱을 실행하세요!

[ 영웅문S# 앱 열기 ]  <-- 터치 시 스마트폰 영웅문S# 앱 자동 실행
```

### 동작 원리
1. 카카오톡 메시지의 **[영웅문S# 앱 열기]** 버튼을 터치합니다.
2. 모바일 브라우저의 리다이렉트 페이지 (`src/app/open-kiwoom/page.tsx` 또는 `m.kiwoom.com`)를 거쳐 iOS/안드로이드의 키움 영웅문S# 앱(`kiwoomsplus://` / `intent://...`)이 자동으로 실행됩니다.
3. 영웅문S# 앱에서 생체인증(지문/Face ID) 후 손쉽게 신한은행 계좌로 송금할 수 있습니다.

### 카카오톡 설정 방법 (`trade/.env`)
```bash
# trade/.env
KAKAO_REST_API_KEY=내_카카오_REST_API_키
KAKAO_ACCESS_TOKEN=내_카카오_액세스_토큰
KAKAO_REFRESH_TOKEN=내_카카오_리프레시_토큰  # 선택: 만료 시 자동 재발급
KIWOOM_APP_URL=https://m.kiwoom.com       # 또는 내 웹서비스 주소/open-kiwoom
```

> **📌 카카오 토큰 발급 초간단 가이드 (2가지 방법)**:
> - **방법 A (추천 - 자동 발급 스크립트)**:
>   1. 카카오 디벨로퍼스에서 REST API 키 확인 및 Redirect URI(`http://localhost:5000/oauth`) 등록
>   2. `python3 kakao_auth.py` 실행 시 브라우저가 열리며 원클릭으로 `.env`에 토큰 자동 저장 및 테스트 발송 완료!
> - **방법 B (수동 발급)**:
>   1. [카카오 디벨로퍼스](https://developers.kakao.com) 로그인 후 애플리케이션 생성
>   2. **[카카오 로그인] > [동의항목]**에서 `카카오톡 메시지 전송 (talk_message)` 활성화
>   3. **[도구] > [REST API 테스트]**에서 액세스 토큰을 즉시 발급받아 `KAKAO_ACCESS_TOKEN`에 입력
>   4. `python3 exchange.py --test-kakao` 명령어로 내 카톡에 메시지가 잘 도착하는지 바로 확인!

---

## 6. 전체 옵션 파라미터 상세

| 옵션 | 단축형 | 기본값 | 설명 |
| :--- | :--- | :---: | :--- |
| `--check` | | `False` | 환전 실행 없이 미국장 실현손익 및 잔고 현황만 조회 |
| `--dry-run` | | `True` | 실제 환전 API를 부르지 않고 계산만 수행하는 모의 실행 모드 |
| `--execute` | | `False` | 실제 환전 신청 TR(`ust31302`)을 호출하는 실전 모드 |
| `--force` | | `False` | 오늘이 21일(직전영업일)인지 날짜 검사를 건너뛰고 강제 실행 |
| `--amount` | `--usd` | `None` | 직접 환전할 달러 금액(USD). 지정 시 20% 계산 대신 이 금액 적용 |
| `--rate-pct` | | `20.0` | 환전할 실현손익 비율(%) |
| `--date` | | `오늘` | 기준일 시뮬레이션 (`YYYY-MM-DD`) |
| `--period-start`| | `직전환전일+1` | 실현손익 집계 시작일 (`YYYY-MM-DD`) |
| `--period-end` | | `오늘` | 실현손익 집계 종료일 (`YYYY-MM-DD`) |
| `--test-kakao` | | `False` | 카카오톡 환전 완료 알림 메시지 발송 테스트 |
| `--notify-kakao`| | `False` | 모의 실행(dry-run/simulate) 시에도 카카오톡 알림 전송 |
| `-y` | `--yes` | `False` | 터미널 대화형 확인 프롬프트 생략 (배치 실행용) |
| `--simulate` | | `False` | 키움 API 대신 가상 데이터로 로컬 테스트 |

