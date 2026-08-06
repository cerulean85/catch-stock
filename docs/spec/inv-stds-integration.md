# inv-stds → catch-stock 통합 계획

`inv-stds`(FastAPI + Vite)의 **20 투자기준 스코어링/스크리너**를 catch-stock(Next.js)로
**TypeScript 포팅**해 하나의 저장소·하나의 배포로 흡수한다.

## 0. 방향과 원칙

- **방향 A — 완전 포팅**: Python 백엔드를 남기지 않는다. 스코어링 로직은 순수 함수라 TS로 1:1 이식하고,
  Python 데이터 클라이언트(FMP/FRED/yfinance)는 TS 클라이언트로 새로 작성한다.
- catch-stock의 **FSD 구조**를 따른다. 새 feature 슬라이스 `src/features/scoring/` 로 편입한다.
  기존 `screener`(월RSI≥70 + 일RSI 3일상승) feature는 **그대로 유지** — 단순 모멘텀 발굴기,
  scoring은 20기준 종합 평가로 역할이 다르다(상호 보완).
- 재사용: `@/shared/lib/rsi`(rsi14), `@/shared/lib/yahoo`, `p-limit` 동시성, Drizzle+Neon, shadcn UI.

## 1. 스택 매핑

| inv-stds (Python) | catch-stock (TS) | 비고 |
|---|---|---|
| FastAPI `app/main.py`,`api/routes.py` | `src/app/api/scoring/*/route.ts` | Next Route Handler |
| `scoring/criteria.py` | `features/scoring/model/criteria.ts` | 밴드 테이블 — 순수 이식 |
| `scoring/engine.py` | `features/scoring/model/engine.ts` | 스코어 계산 — 순수 이식 |
| `scoring/presets.py` | `features/scoring/model/presets.ts` | 순수 이식 |
| `scoring/filters.py` | `features/scoring/model/filters.ts` | 순수 이식 |
| `scoring/technical.py` | `features/scoring/model/technical.ts` | 서브스코어 변환 — 순수 이식 |
| `scoring/interpret.py` | `features/scoring/model/interpret.ts` | 해석 문자열 — 순수 이식 |
| `data/indicators.py`(pandas) | `features/scoring/model/indicators.ts` | SMA/RSI/MACD/ATR/vol — 배열 기반 재작성 |
| `data/fmp.py` | `shared/lib/fmp.ts` | **신규** FMP REST 클라이언트 |
| `data/fred.py` | `shared/lib/fred.ts` | **신규** FRED REST 클라이언트 |
| `data/yf.py` | `shared/lib/yahoo.ts` 확장 | OHLCV·펀더멘털·밸류백분위 추가 |
| `data/provider.py` | `features/scoring/api/build-metrics.ts` | 오케스트레이션 |
| `data/cache.py`(SQLite) | 인메모리 TTL 캐시(스크리너 패턴) + Drizzle | 종목 캐시는 인메모리, 수동 오버레이는 DB |
| `data/universe.py` | `shared/constants/sp500.json` 재사용 | 이미 존재 |
| Vite `frontend/*.jsx` | `features/scoring/ui/*.tsx` | shadcn로 재작성 |

## 2. 데이터 흐름(포팅 후)

```
build-metrics(ticker, overlay)
 ├─ fundamentals: fmp.fundamentals (키 있으면) → 결측 시 yahoo 폴백  → per/pbr/roe/... 원시값
 ├─ price history(OHLCV): fmp.priceHistory → 폴백 yahoo(2y)
 │    └─ indicators.computeAll → ma/rsi/macd/atr/volTrend/week52
 │         └─ technical.*Subscore → moving_average/volume/rsi_macd/risk_reward 0~5
 ├─ valuationPercentile(yahoo 히스토리+EPS) → valuation_band 0~5
 ├─ institutional(overlay) → institutional 0~5 (없으면 제외)
 ├─ overlay 수동: moat/tam/governance/geopolitical (없으면 엔진이 중립3)
 └─ rates_fx: overlay 없으면 fred.ratesFxSubscore (전 종목 공통)
        → engine.scoreTicker(metrics, preset, filters) → 종합 0~100 + 영역·기준별 해석
```

## 3. 데이터 가용성 주의 (SCORING.md §7 그대로 적용)

- FMP 무료 250콜/일 → **캐싱 + S&P500 스코프**로 시작. `refresh=1` 강제 갱신.
- yahoo lib은 현재 **종가만** 반환 → ATR/거래량/52주 계산 위해 **OHLCV 전체**로 확장 필요.
- 밸류에이션 밴드 v1은 **가격 백분위 프록시**(EPS 미반영) — 상승추세주가 고평가로 나오는 한계 유지.
- 정성 3종(해자·TAM·거버넌스) + 지정학은 **수동 오버레이**(기본 중립3), DB에 유저별 저장.

## 4. DB 추가 (Drizzle)

수동 오버레이를 유저별로 저장할 테이블 1개 추가(스코어 캐시는 인메모리라 DB 불필요):

```ts
// scoringOverlays: (userId, symbol) PK
//   moat, tam, governance, geopolitical: smallint 0~5 (nullable)
//   institutionalChange, riskTag: 보조
```

## 5. 단계 (Task #1~5)

1. **Phase 1 — 순수 로직 포팅** (외부 API 불필요, vitest로 자체 검증):
   criteria/engine/presets/filters/technical/indicators/interpret + types + 테스트.
   inv-stds `tests/test_engine.py`의 스모크 케이스를 TS 테스트로 이식해 동치 확인.
2. **Phase 2 — 데이터 프로바이더**: fmp.ts, fred.ts, yahoo 확장, build-metrics.
   API 키 없이도 동작하도록 데모 시드/폴백 유지.
3. **Phase 3 — API + UI**: `/api/scoring/{meta,macro,score,screen}`, scoring UI feature,
   오버레이 Drizzle 테이블·마이그레이션.
4. **Phase 4 — concept2 (로드맵, 후순위)**: 아래 §6.

## 6. concept2 수급왜곡 3전략 — 현실 평가

concept2.md의 3전략은 **현재 inv-stds에 미구현**이며 대체로 **무료 티어로 불가능**한 데이터에 의존한다.
포팅이 아니라 **신규 데이터 파이프라인 구축**이므로 별도 후순위 단계로 둔다.

| 전략 | 필요 데이터 | 가용성 |
|---|---|---|
| 1. 강제청산 차익 | 5일 급락·RSI·거래량폭증(✅) + Short Volume/Dark Pool(🔴 유료) + Altman-Z(🟡 재무로 계산가능) | 부분 |
| 2. 마이크로캡 알파 | 시총·3년흑자·FCF·매출CAGR(🟡 FMP) + 13F 기관지분·애널커버리지(🔴 SEC/유료) + 거래대금(✅) | 부분 |
| 3. 인덱스 리밸런싱 | Russell/S&P 편출 스케줄·MOC 물량(🔴 별도 소스) | 낮음 |

- **먼저 가능한 것**: 전략1의 가격/거래량 조건, 전략2의 재무 조건은 Phase 2 데이터로 즉시 구현 가능.
- **막히는 것**: Short Interest/Dark Pool/13F/리밸런싱 스케줄 → 유료 API(Polygon/FMP 상위) 또는 SEC EDGAR 파서 필요.
- **알림(3단계)**: Slack/Discord 봇 → catch-stock는 웹앱이므로 우선 화면 배지/워치리스트 연동으로 대체, 봇은 선택.

→ Phase 4는 "가격·재무 기반 부분 구현"까지를 1차 목표로 하고, 대체데이터 의존 조건은 데이터 소스 확정 후 착수.

## 7. 검증 기준

- Phase 1: `npm run test` 통과 (엔진 스모크 케이스 Python과 동일 결과).
- Phase 2: 키 없이 데모 종목 스코어 산출, 키 있으면 실데이터 조회.
- Phase 3: `/api/scoring/screen`이 S&P500 스코어 정렬 반환, UI 렌더.
- 각 파일 500줄 이하, kebab-case 폴더 / PascalCase 컴포넌트 (CLAUDE.md §8·§9).
