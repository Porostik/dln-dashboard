import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import type { DB, AggregationStatus } from '../generated/db';
import { DB_TOKEN } from '../db.token';

@Injectable()
export class AggregationJobsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  public async lockBatch(params: {
    limit: number;
    workerId: string;
    lockMs: number;
  }): Promise<string[]> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + params.lockMs);

    const rows = await this.db.transaction().execute(async (trx) => {
      const selected = await sql<{ signature: string }>`
          select signature
          from aggregation_jobs
          where
            (
              status = 'pending'
              or (status = 'processing' and locked_until is not null and locked_until < ${now})
            )
            and (next_retry_at is null or next_retry_at <= ${now})
          order by signature asc
          limit ${params.limit}
          for update skip locked
        `.execute(trx);

      const sigs = selected.rows.map((r) => r.signature);
      if (!sigs.length) return [];

      await trx
        .updateTable('aggregation_jobs')
        .set({
          status: 'processing' as AggregationStatus,
          locked_by: params.workerId,
          locked_until: lockedUntil,
          updated_at: now,
        })
        .where('signature', 'in', sigs)
        .execute();

      return sigs;
    });

    return rows;
  }

  public async markDone(signatures: string[]) {
    if (!signatures.length) return;
    const now = new Date();
    await this.db
      .updateTable('aggregation_jobs')
      .set({
        status: 'done',
        locked_by: null,
        locked_until: null,
        next_retry_at: null,
        updated_at: now,
      })
      .where('signature', 'in', signatures)
      .execute();
  }

  public async markFailed(params: {
    signature: string;
    error: unknown;
    baseDelayMs: number;
    maxDelayMs: number;
  }) {
    const now = new Date();
    const msg = String(
      (params.error as any)?.message ?? params.error ?? 'unknown',
    );

    await this.db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom('aggregation_jobs')
        .select(['attempts'])
        .where('signature', '=', params.signature)
        .executeTakeFirst();

      const attempts = Number(current?.attempts ?? 0) + 1;
      const delay = Math.min(
        params.maxDelayMs,
        params.baseDelayMs * 2 ** (attempts - 1),
      );
      const nextRetryAt = new Date(now.getTime() + delay);

      await trx
        .updateTable('aggregation_jobs')
        .set({
          status: 'failed',
          attempts: attempts as any,
          locked_by: null,
          locked_until: null,
          next_retry_at: nextRetryAt,
          updated_at: now,
        })
        .where('signature', '=', params.signature)
        .execute();

      void msg;
    });
  }

  public async makeSkipped(signatures: string[]) {
    if (!signatures.length) return;
    await this.db
      .updateTable('aggregation_jobs')
      .set({
        status: 'skipped',
        locked_by: null,
        locked_until: null,
      })
      .where('signature', 'in', signatures)
      .execute();
  }
}
