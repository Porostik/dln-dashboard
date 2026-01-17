import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('order_events')
    .dropConstraint('order_id_pk')
    .execute();

  await db.schema
    .alterTable('order_events')
    .addColumn('id', 'bigserial', (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable('order_events')
    .addPrimaryKeyConstraint('order_events_pkey', ['id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('order_events')
    .dropConstraint('order_events_pkey')
    .execute();

  await db.schema.alterTable('order_events').dropColumn('id').execute();

  await db.schema
    .alterTable('order_events')
    .addPrimaryKeyConstraint('order_id_pk', ['order_id', 'type'])
    .execute();
}
