import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pipeline_state').ifExists().execute();

  await db.schema
    .alterTable('indexer_state')
    .dropColumn('backfill_cursor')
    .execute();
  await db.schema
    .alterTable('indexer_state')
    .dropColumn('forward_cursor')
    .execute();
  await db.schema
    .alterTable('indexer_state')
    .addColumn('cursor', 'text')
    .execute();
  await db.schema
    .alterTable('indexer_state')
    .addColumn('is_stopped', 'boolean')
    .execute();
  await db.schema
    .alterTable('indexer_state')
    .addUniqueConstraint('indexer_state_program_mode_unique', [
      'program_id',
      'mode',
    ])
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .dropConstraint('indexer_state_pkey')
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('indexer_state')
    .dropConstraint('indexer_state_program_mode_unique')
    .execute();
  await db.schema.alterTable('indexer_state').dropColumn('cursor').execute();
  await db.schema
    .alterTable('indexer_state')
    .dropColumn('is_stopped')
    .execute();

  await db.schema
    .createTable('pipeline_state')
    .ifNotExists()
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .execute();
}
