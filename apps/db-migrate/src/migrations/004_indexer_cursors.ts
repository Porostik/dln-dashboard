import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('indexer_state')
    .addColumn('backfill_cursor', 'text')
    .addColumn('forward_cursor', 'text')
    .execute();

  await db.executeQuery(
    sql`
    UPDATE indexer_state
    SET
      backfill_cursor = COALESCE(backfill_cursor, last_processed_sig),
      forward_cursor  = COALESCE(forward_cursor,  last_processed_sig)
    WHERE last_processed_sig IS NOT NULL
  `.compile(db),
  );

  await db.schema
    .alterTable('indexer_state')
    .dropColumn('last_processed_sig')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('indexer_state')
    .addColumn('last_processed_sig', 'text')
    .execute();

  await db.executeQuery(
    sql`
    UPDATE indexer_state
    SET last_processed_sig = COALESCE(backfill_cursor, forward_cursor)
    WHERE backfill_cursor IS NOT NULL OR forward_cursor IS NOT NULL
  `.compile(db),
  );

  await db.schema
    .alterTable('indexer_state')
    .dropColumn('backfill_cursor')
    .dropColumn('forward_cursor')
    .execute();
}
