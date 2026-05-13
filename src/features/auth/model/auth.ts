import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/shared/db/client';
import { accounts, sessions, users, verificationTokens } from '@/shared/db/schema';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  secret: process.env.AUTH_SECRET ?? 'dev-only-fallback-secret-set-AUTH_SECRET-in-prod',
});
