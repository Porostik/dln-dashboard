import { Injectable, Inject } from '@nestjs/common';
import type { Kysely, Selectable } from 'kysely';
import { DB, IndexerMode, IndexerState } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class IndexerStateRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  async getOrCreate(
    programId: string,
    mode: IndexerMode,
  ): Promise<Selectable<IndexerState>> {
    const row = await this.db
      .selectFrom('indexer_state')
      .selectAll()
      .where('program_id', '=', programId)
      .where('mode', '=', mode)
      .executeTakeFirst();

    if (row) return row;

    await this.db
      .insertInto('indexer_state')
      .values({ program_id: programId, mode })
      .onConflict((oc) => oc.columns(['program_id', 'mode']).doNothing())
      .execute();

    return await this.db
      .selectFrom('indexer_state')
      .selectAll()
      .where('program_id', '=', programId)
      .where('mode', '=', mode)
      .executeTakeFirstOrThrow();
  }

  async stop(programId: string, mode: IndexerMode) {
    await this.db
      .updateTable('indexer_state')
      .set({
        is_stopped: true,
      })
      .where('program_id', '=', programId)
      .where('mode', '=', mode)
      .execute();
  }
}
