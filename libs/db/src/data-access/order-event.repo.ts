import { Inject, Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { DB_TOKEN } from '../db.token';
import { DB, OrderEvents } from '../generated/db';

@Injectable()
export class OrderEventRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  public async insert(event: Insertable<OrderEvents>) {
    await this.db
      .insertInto('order_events')
      .values(event)
      .onConflict((oc) =>
        oc.columns(['signature', 'type', 'order_id']).doNothing(),
      )
      .returning(['signature'])
      .execute();
  }

  public async insertMany(events: Insertable<OrderEvents>[]) {
    if (!events.length) return;
    await this.db
      .insertInto('order_events')
      .values(events)
      .onConflict((oc) =>
        oc.columns(['signature', 'type', 'order_id']).doNothing(),
      )
      .returning(['signature'])
      .execute();
  }
}
