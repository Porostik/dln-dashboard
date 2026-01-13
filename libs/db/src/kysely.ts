import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { config } from './config';
import { DB } from './generated/db';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});
