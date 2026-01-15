import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Selectable } from 'kysely';
import { DB, IndexerState } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class IndexerStateRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  async getOrCreate(programId: string): Promise<Selectable<IndexerState>> {
    const row = await this.db
      .selectFrom('indexer_state')
      .selectAll()
      .where('program_id', '=', programId)
      .executeTakeFirst();

    if (row) return row;

    await this.db
      .insertInto('indexer_state')
      .values({
        program_id: programId,
        backfill_cursor: null,
        forward_cursor: null,
        mode: 'backfill',
      })
      .onConflict((oc) => oc.column('program_id').doNothing())
      .execute();

    return await this.db
      .selectFrom('indexer_state')
      .selectAll()
      .where('program_id', '=', programId)
      .executeTakeFirstOrThrow();
  }
}
