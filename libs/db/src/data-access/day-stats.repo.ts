import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { DB_TOKEN } from '../db.token';
import { DB, EventType } from '../generated/db';

@Injectable()
export class DayStatsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  public async updateDayDelta(
    day: Date,
    type: EventType,
    volumeUsdDelta: string,
    count: number,
  ) {
    const isCreate = type === 'create';

    const createCounterDelta = isCreate ? `${count}` : '0';
    const fulfillCounterDelta = isCreate ? '0' : `${count}`;

    const createVolume = isCreate ? volumeUsdDelta : '0';
    const fulfillVolume = isCreate ? '0' : volumeUsdDelta;

    await this.db
      .insertInto('daily_stats')
      .values({
        day,
        created_count: createCounterDelta,
        fulfilled_count: fulfillCounterDelta,
        created_volume_usd: createVolume,
        fulfilled_volume_usd: fulfillVolume,
      })
      .onConflict((oc) =>
        oc.column('day').doUpdateSet({
          created_count: sql`daily_stats.created_count + ${createCounterDelta}::numeric`,
          fulfilled_count: sql`daily_stats.fulfilled_count + ${fulfillCounterDelta}::numeric`,
          created_volume_usd: sql`daily_stats.created_volume_usd + ${createVolume}::numeric`,
          fulfilled_volume_usd: sql`daily_stats.fulfilled_volume_usd + ${fulfillVolume}::numeric`,
        }),
      )
      .execute();
  }

  public async getDayVolumes(from?: Date, to?: Date) {
    let q = this.db
      .selectFrom('daily_stats')
      .select([
        'day',
        'created_count',
        'created_volume_usd',
        'fulfilled_count',
        'fulfilled_volume_usd',
      ])
      .orderBy('day', 'asc');

    if (from) q = q.where('day', '>=', from);
    if (to) q = q.where('day', '<=', to);

    return q.execute();
  }
}
