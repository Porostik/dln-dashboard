import { Inject, Injectable } from '@nestjs/common';
import type { Insertable, Kysely } from 'kysely';
import { DB, RawTx } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class IndexerIngestionRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  public async ingresPage(
    txs: Insertable<RawTx>[],
    programId: string,
    cursor: { backfill?: string; forward?: string },
  ) {
    return await this.db.transaction().execute(async (trx) => {
      if (txs.length) {
        await trx
          .insertInto('raw_tx')
          .values(txs)
          .onConflict((oc) => oc.column('signature').doNothing())
          .execute();

        await trx
          .insertInto('aggregation_jobs')
          .values(
            txs.map((tx) => ({
              signature: tx.signature,
              status: 'pending',
            })),
          )
          .onConflict((oc) => oc.column('signature').doNothing())
          .execute();
      }

      const patch: Partial<DB['indexer_state']> = {};
      if (cursor.backfill) patch.backfill_cursor = cursor.backfill;
      if (cursor.forward) patch.forward_cursor = cursor.forward;

      if (Object.keys(patch).length > 0) {
        await trx
          .updateTable('indexer_state')
          .set(patch)
          .where('program_id', '=', programId)
          .execute();
      }
    });
  }
}
