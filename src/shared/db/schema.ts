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
  tickers: text('tickers').array().notNull().default([]),
  tags: text('tags').array().notNull().default([]),
  tradeTypes: text('tradeTypes').array().notNull().default([]),
  riskChecks: text('riskChecks').array().notNull().default([]),
  tradeQty: numeric('tradeQty'),
  tradePrice: numeric('tradePrice'),
  tradeFee: numeric('tradeFee'),
  sentiment: smallint('sentiment'),
  horizon: text('horizon'),
  targetReturn: numeric('targetReturn'),
  actualReturn: numeric('actualReturn'),
  tradedAt: timestamp('tradedAt', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).notNull().defaultNow(),
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
