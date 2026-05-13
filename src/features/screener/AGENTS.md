# screener feature

S&P 500 RSI 기반 종목 발굴.

- `model/screener.ts`는 순수 함수로 유지 (테스트 가능). I/O 금지.
- `api/server.ts`는 서버 전용 (`'server-only'` 마커). 캐시·동시성 제어 담당.
- `api/client.ts`는 브라우저 fetch만 담당.
- 새 필터 조건 추가 시 `model/types.ts`의 `ScreenerFilters`를 먼저 확장하고 `screenOne` 분기에 반영. 기본값(`DEFAULT_FILTERS`)은 spec과 일치해야 함.
- 캐시 TTL/동시성 상수는 `api/server.ts` 상단에 두고 환경변수 분리는 추후 과제.
