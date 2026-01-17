import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('order_events')
    .addUniqueConstraint('order_events_signature_type_order_id_uniq', [
      'signature',
      'type',
      'order_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('order_events')
    .dropConstraint('order_events_signature_type_order_id_uniq')
    .execute();
}
