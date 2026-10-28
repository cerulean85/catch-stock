# 계좌 잔고 수집 서버

키움 REST API는 호출하는 서버의 공인 IP를 개발자센터에 등록해야 한다.
그래서 잔고 조회는 고정 IP를 가진 이 서버에서만 하고, 웹(Next.js)은 DB만 읽는다.

```
[이 수집기] --키움 REST--> 키움
     |
     v (accountHolding / accountSync)
  Neon Postgres
     ^
     | (읽기 전용)
[Next.js /account]
```

웹은 키움 앱키를 갖지 않는다. 키는 이 디렉터리의 `.env`에만 둔다.

## 설치

```bash
cd trade
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

`.env`는 `.gitignore`에 걸려 저장소에 올라가지 않는다(`.env.example`도 같은 패턴에 걸려 제외된다).
아래 값을 직접 `trade/.env`로 만든다.

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | 웹과 같은 Neon Postgres 접속 문자열 |
| `KIWOOM_APP_KEY` | 키움 앱키 |
| `KIWOOM_SECRET_KEY` | 키움 시크릿키 |
| `KIWOOM_MOCK` | 모의투자면 `true` (기본 `false`) |
| `SYNC_INTERVAL_SEC` | 상주 실행 시 조회 간격(초). 기본 `300` |
| `KAKAO_REST_API_KEY` | 카카오 디벨로퍼스 REST API 키 (토큰 자동 갱신용) |
| `KAKAO_ACCESS_TOKEN` | 카카오톡 메시지 전송용 액세스 토큰 (필수) |
| `KAKAO_REFRESH_TOKEN`| 카카오톡 리프레시 토큰 (선택: 토큰 만료 시 자동 재발급) |
| `KIWOOM_APP_URL`     | 알림 버튼 터치 시 이동할 URL (영웅문S# 앱 자동 실행) |

키는 반드시 이 파일에만 둔다. 코드에 직접 적지 않는다.

DB 테이블은 웹 쪽 마이그레이션으로 만든다(프로젝트 루트에서 `npm run db:migrate`).

## 실행

```bash
python sync.py --once              # 1회 실행 (cron으로 돌릴 때)
python sync.py                     # SYNC_INTERVAL_SEC 주기로 계속 (기본 300초)
python sync.py --once --backfill-days 30   # 과거 체결 내역 채우기 (최초 1회)
```

`--once`는 성공 시 종료 코드 0, 조회 실패가 하나라도 있으면 1을 반환한다.

cron 예시 (평일 장중 5분마다):

```
*/5 9-16 * * 1-5 cd /path/to/catch-stock/trade && .venv/bin/python sync.py --once >> sync.log 2>&1
```

systemd로 상주시키려면 `python sync.py`를 그대로 서비스로 등록하면 된다.

## 동작

- 국내(`kt00004`)와 해외(`ust21070`)를 각각 조회한다. **한쪽이 실패해도 다른 쪽은 적재**하고,
  실패 사유는 `accountSync.message`에 남아 웹 화면에 그대로 표시된다.
- 조회에 성공한 구간만 갈아끼운다. 해외 조회가 실패한 회차에는 기존 해외 잔고를 지우지 않는다.
- 전량 매도되어 응답에서 빠진 종목은 해당 구간 적재 시 삭제된다.
- 토큰은 프로세스 메모리에 들고 있다가 401이 나면 한 번 재발급해 재시도한다.
- 체결 내역(`kt00007`·`ust21100`)도 함께 쌓는다. 잔고와 달리 **누적**이라 지우지 않고 덮어쓰기만 한다
  (`scope + 거래일 + 거래번호`가 키). 국내 TR은 날짜를 하나만 받아서 하루씩 조회하므로,
  상주 실행 중에는 오늘치만 본다. 과거는 `--backfill-days`로 한 번 채운다.
- 연속조회(`cont-yn`/`next-key`)를 따라가되 20페이지에서 멈추고, 잘렸으면 그 사실을 에러로 남긴다.
- 매 회차 공인 IP를 함께 기록한다. 웹 `/account` 하단에 표시되므로, 키움에 등록한 IP와
  다르면 바로 알 수 있다.

## 월간 미국주식 수익 20% 자동 환전 (`exchange.py`)

매월 21일 09:30에 최근 1개월간 미국주식 실현손익의 20%를 달러(USD)에서 원화(KRW)로 환전합니다.

### 특징 및 룰
1. **일정 판별 (`schedule_helper.py`)**:
   - 기준일은 매월 21일입니다.
   - 21일이 주말(토, 일)이나 공휴일/대체공휴일인 경우 **직전 영업일(금요일 또는 직전 평일)**로 자동 보정됩니다.
   - 환전 당일이 아니면 스크립트가 실행되어도 건너뛰고 종료합니다.
2. **손익 판별**:
   - 최근 1개월(직전 환전일 다음날 ~ 오늘) 실현손익(`ust21530`)이 **0 이하(손실)**이면 환전을 건너뜁니다.
3. **외화환전가능금액 한도 적용**:
   - 실현손익의 20%를 계산한 뒤, 현재 계좌의 외화환전가능금액(`ust31300`)을 조회합니다.
   - 계좌 내 달러 예수금이 부족하면 가능 금액 한도 내에서만 환전합니다.
4. **송금(출금) 연계**:
   - 키움 REST API는 금융보안 규정상 외부 계좌 직접 송금 API를 제공하지 않습니다.
   - 대신 **주거래 은행 앱(토스, 카카오뱅크 등)의 '오픈뱅킹 자동 모으기/가져오기'를 매월 21일 오후로 설정**해 두면, 오전 9:30에 환전된 원화가 내 은행 계좌로 자동 입금되어 **완전 자동화**됩니다.
5. **환전 완료 카카오톡 알림 & 영웅문S# 원터치 실행**:
   - 환전 완료 시 카카오톡 "나에게 보내기"로 환전 결과(매도 달러, 입금 원화, 적용 환율)가 즉시 전송됩니다.
   - 메시지 내 **[영웅문S# 앱 열기]** 버튼을 누르면 스마트폰에서 키움 영웅문S# 앱이 바로 실행되어 간편하게 송금 및 잔고를 확인할 수 있습니다.

### 실행 방법

```bash
# 1. 실제 계좌 현황 조회 (실현손익, 외화예수금, 환율, 평가액만 확인, 환전 실행 없음)
python3 exchange.py --check

# 2. 안전 모의 실행 (환전 API 호출 없이 20% 계산 및 로직만 점검, 기본값)
python3 exchange.py --dry-run
python3 exchange.py --force --dry-run   # 오늘이 21일이 아니어도 강제 모의 테스트

# 3. 원하는 금액 직접 지정 모의 환전 (--amount / --usd)
python3 exchange.py --force --dry-run --amount 10   # 20% 계산 대신 $10 환전 시뮬레이션

# 4. 로컬 IP 미등록 환경 가상 테스트 (--simulate)
python3 exchange.py --check --simulate
python3 exchange.py --force --dry-run --simulate

# 5. 카카오톡 알림 발송 테스트 (--test-kakao)
python3 exchange.py --test-kakao                   # 카카오톡 "나에게 보내기" 테스트
python3 exchange.py --force --dry-run --notify-kakao # 모의 환전 후 카톡 알림 발송

# 6. 실제 환전 실행 (--execute 플래그 필수, 대화형 확인 프롬프트 제공)
python3 exchange.py --execute
python3 exchange.py --force --execute --amount 1    # 소액($1)으로 강제 실전 테스트 (확인창 뜸)
```

### cron 등록 예시 (매월 15~21일 평일 오전 9:30)

21일이 일요일이면 19일(금), 토요일이면 20일(금)에 실행되므로 15일부터 21일까지 매일 9:30에 실행되도록 등록하면 스크립트가 영업일을 자동으로 판별하여 정확히 해당 일자에만 환전을 수행합니다.

```cron
30 9 15-21 * 1-5 cd /path/to/catch-stock/trade && .venv/bin/python exchange.py --execute >> exchange.log 2>&1
```

## 테스트

외부 의존성 및 실제 API 호출 없이 순수 단위 테스트를 수행합니다.

```bash
cd trade && python3 -m unittest discover -v
```

## 파일

| 파일 | 역할 |
|------|------|
| `sync.py` | 잔고 및 체결 내역 주기 수집 + DB 적재 |
| `exchange.py` | 매월 21일(직전영업일) 미국장 수익 20% 환전 실행기 |
| `schedule_helper.py` | 매월 21일 및 공휴일/대체공휴일 직전 영업일 계산 |
| `kiwoom.py` | 토큰 발급, TR 호출 (잔고, 체결, 실현손익, 환전) |
| `parse.py` | 응답 → DB 행 및 결과 변환 (순수 함수) |
| `kakao.py` | 카카오톡 나에게 보내기 메시지 전송 및 토큰 자동 갱신 |
| `kakao_auth.py` | 카카오 OAuth 토큰 원클릭 발급 및 .env 저장 도우미 |
| `test_exchange.py` | 환전 파이프라인 및 영업일 로직 Mock 단위 테스트 |
| `test_parse.py` | `parse.py` 단위 테스트 |
| `test.py` | 최초 API 확인용 스크립트 (참고용) |
