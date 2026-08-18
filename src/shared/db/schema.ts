import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const journals = pgTable('journal', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  // 'draft'(임시저장) | 'published'. 기존 행은 모두 published로 본다.
  status: text('status').notNull().default('published'),
  // 고정한 일지는 정렬과 무관하게 목록 맨 위에 올린다.
  pinned: boolean('pinned').notNull().default(false),
  tickers: text('tickers').array().notNull().default([]),
  tags: text('tags').array().notNull().default([]),
  tradeTypes: text('tradeTypes').array().notNull().default([]),
  riskChecks: text('riskChecks').array().notNull().default([]),
  tradeQty: numeric('tradeQty'),
  tradePrice: numeric('tradePrice'),
  sellPrice: numeric('sellPrice'),
  tradeFee: numeric('tradeFee'),
  sentiment: smallint('sentiment'),
  horizon: text('horizon'),
  targetReturn: numeric('targetReturn'),
  actualReturn: numeric('actualReturn'),
  // 이 매도 일지가 청산한 원래 매수 일지의 id. 보유기간·실현손익을 두 일지에 걸쳐 계산한다.
  linkedJournalId: text('linkedJournalId'),
  // 재점검 예정일. 지났는데 reviewedAt이 비어 있으면 '검토 필요'로 뜬다.
  reviewAt: timestamp('reviewAt', { mode: 'date' }),
  reviewedAt: timestamp('reviewedAt', { mode: 'date' }),
  // 회고 채점: 결과(수익/손실)는 계산으로 나오므로, 결과와 무관하게 판단 과정이
  // 타당했는지만 1~5로 받는다. 실력과 운을 갈라 보기 위한 축이다.
  processScore: smallint('processScore'),
  reviewNote: text('reviewNote'),
  tradedAt: timestamp('tradedAt', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

// 유저별 투자 원칙 1건. 일지 목록 상단에 항상 띄워두는 매매 기준 메모.
export const investmentPrinciples = pgTable('investmentPrinciple', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

// 유저별 장 개시 전/장 중/마감 후 할 일 메모 1건. 투자 원칙 바로 아래에 띄운다.
export const marketNotes = pgTable('marketNote', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  preOpen: text('preOpen').notNull().default(''),
  intraday: text('intraday').notNull().default(''),
  postClose: text('postClose').notNull().default(''),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

// 유저별 '중기 스윙 골디락스' 메모 1건. 장 개시 전후 할 일 바로 아래에 띄운다.
export const swingNotes = pgTable('swingNote', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

// 유저별 종목 리스크 평가 기준 1건. 비어 있으면 기본 초안(DEFAULT_RISK_CRITERIA)을 쓴다.
export const riskCriteria = pgTable('riskCriteria', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
});

// 종목별 리스크 평가 결과 1건. 평가할 때마다 쌓아서 과거 이력을 그대로 남긴다.
export const riskAssessments = pgTable('riskAssessment', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  code: text('code').notNull(),
  // 평가 당시의 종목명. 나중에 잔고에서 빠져도 이력이 읽히게 남겨둔다.
  name: text('name').notNull().default(''),
  level: text('level').notNull(),
  summary: text('summary').notNull().default(''),
  // 평가 기준을 고치면 항목 구성도 바뀌므로 결과를 통째로 보관한다.
  sections: jsonb('sections')
    .$type<{ title: string; level: string; body: string }[]>()
    .notNull()
    .default([]),
  watchlist: text('watchlist').array().notNull().default([]),
  sources: jsonb('sources').$type<{ title: string; uri: string }[]>().notNull().default([]),
  // 웹 검색을 실제로 돌렸는지. 안 돌린 평가는 화면에서 따로 표시한다.
  searched: boolean('searched').notNull().default(false),
  model: text('model').notNull().default(''),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});

// 골디락스 종목 탐색 1회분. 탐색할 때마다 쌓고 목록에는 가장 최근 것을 띄운다.
export const goldilocksScans = pgTable('goldilocksScan', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // 종목별 상세(재료·차트·수급·촉매·손절)를 그대로 보관한다.
  candidates: jsonb('candidates')
    .$type<
      {
        name: string;
        code: string;
        summary: string;
        story: string;
        chart: string;
        supply: string;
        catalyst: string;
        stopLoss: string;
      }[]
    >()
    .notNull()
    .default([]),
  note: text('note').notNull().default(''),
  sources: jsonb('sources').$type<{ title: string; uri: string }[]>().notNull().default([]),
  searched: boolean('searched').notNull().default(false),
  model: text('model').notNull().default(''),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
});

// 키움 계좌 잔고 스냅샷. 고정 IP를 가진 수집 서버(trade/)가 주기적으로 채우고,
// 웹은 읽기만 한다. 계좌가 하나뿐이라 유저별로 나누지 않는다.
export const accountHoldings = pgTable(
  'accountHolding',
  {
    scope: text('scope').notNull(), // 'domestic' | 'overseas'
    code: text('code').notNull(),
    name: text('name').notNull().default(''),
    quantity: numeric('quantity').notNull().default('0'),
    avgPrice: numeric('avgPrice').notNull().default('0'),
    currentPrice: numeric('currentPrice').notNull().default('0'),
    evalAmount: numeric('evalAmount').notNull().default('0'),
    pnlAmount: numeric('pnlAmount').notNull().default('0'),
    pnlRate: numeric('pnlRate').notNull().default('0'),
    currency: text('currency').notNull().default('KRW'),
    evalAmountKrw: numeric('evalAmountKrw'),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (holding) => ({
    compoundKey: primaryKey({ columns: [holding.scope, holding.code] }),
  }),
);

// 체결 내역. 수집 서버가 kt00007(국내)·ust21100(해외)에서 받아 쌓는다.
// 같은 체결이 여러 번 수집돼도 (scope, tradedOn, dealId)로 덮어쓴다.
export const accountTrades = pgTable(
  'accountTrade',
  {
    scope: text('scope').notNull(), // 'domestic' | 'overseas'
    tradedOn: text('tradedOn').notNull(), // 'YYYY-MM-DD'
    dealId: text('dealId').notNull(), // 국내 주문번호 / 해외 거래번호
    tradedTime: text('tradedTime'), // 'HH:mm:ss', 해외는 없음
    code: text('code').notNull(),
    name: text('name').notNull().default(''),
    side: text('side').notNull().default('other'), // 'buy' | 'sell' | 'other'
    sideLabel: text('sideLabel'), // 키움 원문(주문구분/적요명). 참고용
    quantity: numeric('quantity').notNull().default('0'),
    price: numeric('price').notNull().default('0'),
    amount: numeric('amount').notNull().default('0'),
    fee: numeric('fee'),
    currency: text('currency').notNull().default('KRW'),
  },
  (trade) => ({
    compoundKey: primaryKey({ columns: [trade.scope, trade.tradedOn, trade.dealId] }),
  }),
);

// 수집 서버의 마지막 동기화 상태. publicIp는 키움에 등록해야 할 IP를 확인하는 용도.
export const accountSyncs = pgTable('accountSync', {
  id: text('id').primaryKey(), // 'kiwoom'
  status: text('status').notNull().default('ok'), // 'ok' | 'error'
  message: text('message'),
  publicIp: text('publicIp'),
  syncedAt: timestamp('syncedAt', { mode: 'date' }).notNull().defaultNow(),
});

export const watchlistItems = pgTable(
  'watchlistItem',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (item) => ({
    compoundKey: primaryKey({ columns: [item.userId, item.symbol] }),
  }),
);

// 스코어링 수동 오버레이(정성 기준)를 유저·종목별로 저장.
// moat/tam/governance/geopolitical: 0~5 서브스코어(미설정 시 null → 엔진이 중립 3점).
// institutionalChange: 기관 수급 변화 보조, riskTag: 자유 텍스트 메모.
export const scoringOverlays = pgTable(
  'scoringOverlay',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    moat: smallint('moat'),
    tam: smallint('tam'),
    governance: smallint('governance'),
    geopolitical: smallint('geopolitical'),
    institutionalChange: smallint('institutionalChange'),
    riskTag: text('riskTag'),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
  },
  (overlay) => ({
    compoundKey: primaryKey({ columns: [overlay.userId, overlay.symbol] }),
  }),
);
