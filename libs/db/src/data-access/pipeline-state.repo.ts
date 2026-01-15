import { Injectable, Inject } from '@nestjs/common';
import type { Insertable, Kysely, Selectable } from 'kysely';
import { DB, PipelineState } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class PipelineStateRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  async getState(): Promise<Selectable<PipelineState>> {
    return await this.db
      .selectFrom('pipeline_state')
      .where('id', '=', 1)
      .selectAll()
      .executeTakeFirstOrThrow();
  }

  async geBackfillDone(): Promise<boolean> {
    const backfillDone = await this.db
      .selectFrom('pipeline_state')
      .where('id', '=', 1)
      .select('backfill_done')
      .executeTakeFirstOrThrow();

    return !!backfillDone.backfill_done;
  }

  async updateState(input: Insertable<PipelineState>): Promise<void> {
    await this.db.insertInto('pipeline_state').values(input).execute();
  }
}
