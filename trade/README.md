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

## 테스트

응답 파싱은 외부 의존성 없이 테스트할 수 있다.

```bash
cd trade && python3 -m unittest test_parse
```

## 파일

| 파일 | 역할 |
|------|------|
| `sync.py` | 진입점. 주기 실행 + DB 적재 |
| `kiwoom.py` | 토큰 발급, TR 호출, 공인 IP 조회 |
| `parse.py` | 응답 → DB 행 변환 (순수 함수) |
| `test_parse.py` | `parse.py` 테스트 |
| `test.py` | 최초 API 확인용 스크립트 (참고용) |
