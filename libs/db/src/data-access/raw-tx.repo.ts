import { Injectable, Inject } from '@nestjs/common';
import type { Insertable, Kysely } from 'kysely';
import { DB_TOKEN } from '../db.token';
import { RawTx, DB } from '../generated/db';

export type NewRawTx = Insertable<RawTx>;

@Injectable()
export class RawTxRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  async insertMany(rows: NewRawTx[]): Promise<number> {
    if (rows.length === 0) return 0;

    const res = await this.db
      .insertInto('raw_tx')
      .values(rows)
      .onConflict((oc) => oc.column('signature').doNothing())
      .executeTakeFirst();

    return Number(res.numInsertedOrUpdatedRows ?? 0n);
  }

  async getBySignatures(signatures: string[]) {
    if (signatures.length === 0) return [];
    return this.db
      .selectFrom('raw_tx')
      .select(['signature', 'tx_data', 'slot', 'block_time'])
      .where('signature', '=', signatures)
      .execute();
  }
}
