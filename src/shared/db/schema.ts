import {
  integer,
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
