import { Injectable, Inject } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { DB, IndexerMode } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class IndexerStateRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  async getState(): Promise<{
    lastProcessedSig: string;
    mode: IndexerMode;
  } | null> {
    const row = await this.db
      .selectFrom('indexer_state')
      .select(['last_processed_sig', 'mode'])
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!row) return null;
    return { lastProcessedSig: row.last_processed_sig, mode: row.mode };
  }

  async setState(input: {
    lastProcessedSig: string;
    mode: IndexerMode;
  }): Promise<void> {
    await this.db
      .insertInto('indexer_state')
      .values({
        last_processed_sig: input.lastProcessedSig,
        mode: input.mode,
      })
      .execute();
  }
}
