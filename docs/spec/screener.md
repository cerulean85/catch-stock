# Screener Spec

S&P 500 종목을 대상으로 RSI14 조건을 만족하는 종목을 발굴하고 Grid로 보여주는 단일 화면 기능.

## 1. 사용자 시나리오

1. 사용자가 `/` 페이지에 진입한다.
2. 시스템은 S&P 500 전 종목의 일봉/월봉을 가져와 RSI14를 계산한다.
3. 조건 `monthlyRSI14 ≥ 70` AND `일 RSI14가 연속 3일 상승 추세`를 만족하는 종목만 남긴다.
4. 결과를 Grid에 표시한다.
5. 사용자는 "새로고침" 버튼으로 재계산을 트리거할 수 있다.

## 2. 필터 정의

| 필드 | 조건 |
|------|------|
| `monthlyRSI14` | `>= 70` |
| `3-Day RSI Uptrend` | 최근 3거래일의 dailyRSI14가 연속 상승 (각 날짜의 RSI14 > 전날 RSI14) |

- RSI는 **종가 기준 14기간 Wilder RSI**로 통일.
- 일봉 부족(거래일 < 17)인 종목은 결과에서 제외 (RSI14 계산에 15일 + 상승 추세 확인에 3일).
- 월봉 부족(월 < 15)인 종목은 결과에서 제외.

## 3. Grid 표시 컬럼

| 컬럼 | 키 | 설명 |
|------|-----|------|
| Symbol | `symbol` | 티커 (예: `AAPL`) |
| Name | `name` | 회사명 |
| Sector | `sector` | GICS 섹터(가능하면) |
| Price | `price` | 최근 종가 (USD) |
| Daily RSI14 | `dailyRSI14` | 소수점 2자리 |
| Monthly RSI14 | `monthlyRSI14` | 소수점 2자리 |

- 정렬: 기본 `monthlyRSI14` 내림차순.
- 컬럼 헤더 클릭으로 정렬 토글.
- 결과 0개일 때 빈 상태 컴포넌트 노출.
- 로딩 중에는 스켈레톤/스피너.
- 에러 시 에러 메시지 + 재시도 버튼.

## 4. 데이터 파이프라인

```
[S&P500 티커 목록 (정적 JSON)]
        │
        ▼
[Yahoo Finance(일봉) 병렬 fetch]   [Yahoo Finance(월봉) 병렬 fetch]
        │                                  │
        └────────────┬─────────────────────┘
                     ▼
              [RSI14 계산]
                     ▼
              [필터링 (조건식)]
                     ▼
              [캐시 저장 (TTL 15분)]
                     ▼
                [JSON 응답]
```

### 4.1 데이터 소스

- **`yahoo-finance2`** (npm) 사용. API 키 불필요.
- 일봉: 최근 60거래일 가져오기(여유분 포함, RSI14에 최소 15개 필요).
- 월봉: 최근 36개월 가져오기.

### 4.2 동시성/레이트 제어

- 500개 종목을 병렬 fetch하되, 동시 요청 수는 **최대 10**으로 제한(`p-limit` 사용).
- 개별 요청 실패는 해당 종목만 스킵하고 로그에 기록(전체 응답을 실패시키지 않음).

### 4.3 캐시

- 서버 메모리(LRU 또는 단순 Map)에 마지막 결과를 보관, TTL **15분**.
- 캐시 키: `screener:v1`.
- 강제 새로고침 쿼리(`?refresh=1`)면 캐시 무시 후 재계산.

## 5. API 계약

### `GET /api/screener`

**Query**
- `refresh` (optional): `1`이면 캐시 무시.

**Response (200)**
```json
{
  "generatedAt": "2026-05-07T13:24:11.000Z",
  "cache": { "hit": false, "ttlSeconds": 900 },
  "filters": {
    "monthlyRSI14": { "min": 70 },
    "dailyRSI14Uptrend": { "days": 3 }
  },
  "items": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "sector": "Information Technology",
      "price": 187.34,
      "dailyRSI14": 56.12,
      "monthlyRSI14": 74.88
    }
  ],
  "skipped": [
    { "symbol": "BRK.B", "reason": "fetch_failed" }
  ]
}
```

**Response (5xx)**
```json
{ "error": "internal", "message": "..." }
```

## 6. RSI14 계산식

Wilder RSI:
1. `delta_t = close_t - close_{t-1}`
2. `gain_t = max(delta_t, 0)`, `loss_t = max(-delta_t, 0)`
3. 첫 14개 평균: `avgGain = mean(gain[1..14])`, `avgLoss = mean(loss[1..14])`
4. 이후 SMMA: `avgGain_t = (avgGain_{t-1} * 13 + gain_t) / 14`, 동일하게 loss
5. `RS = avgGain / avgLoss`, `RSI = 100 - 100 / (1 + RS)`
6. `avgLoss == 0` 이면 `RSI = 100`.

단위 테스트는 [공식 예제 시계열](https://en.wikipedia.org/wiki/Relative_strength_index)로 검증.

## 7. 비기능 요구사항

- 첫 응답(콜드 캐시)은 60초 내에 완료되어야 함(목표치, 측정 후 조정).
- 핫 캐시 응답은 200ms 이내.
- 파일당 500줄 이하(CLAUDE.md §8).
- `npm run test` 모두 통과.

## 8. 비범위(Non-goals)

- 인증/회원
- 차트/뉴스/펀더멘털
- 알림/스케줄러
- 종목 즐겨찾기
- 모바일 전용 UI 최적화(데스크톱 우선, 반응형은 기본 수준)

## 9. 폴더 구조 (FSD)

```
src/
├─ app/
│  ├─ page.tsx                 # 화면 진입점
│  ├─ layout.tsx
│  └─ api/screener/route.ts    # API 라우트
├─ features/
│  └─ screener/
│     ├─ ui/                   # ScreenerGrid, EmptyState, ErrorState
│     ├─ model/                # zustand store, types
│     ├─ api/                  # client fetcher
│     ├─ AGENTS.md
│     └─ index.ts
├─ shared/
│  ├─ lib/
│  │  ├─ rsi.ts               # RSI14 계산
│  │  └─ yahoo.ts             # yahoo-finance2 어댑터
│  ├─ constants/
│  │  └─ sp500.json
│  └─ ui/                     # shadcn 컴포넌트
└─ ...
```
