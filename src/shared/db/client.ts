import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://placeholder:placeholder@localhost/placeholder';

export const db = drizzle(neon(connectionString), { schema });
