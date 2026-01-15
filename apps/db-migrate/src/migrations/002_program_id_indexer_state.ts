import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('indexer_state')
    .addColumn('program_id', 'text')
    .execute();

  await db
    .updateTable('indexer_state')
    .set({
      program_id: sql`'legacy'`,
    })
    .where('program_id', 'is', null)
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .alterColumn('program_id', (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .dropConstraint('indexer_state_pkey')
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .addPrimaryKeyConstraint('indexer_state_pkey', ['program_id'])
    .execute();

  await db.schema.alterTable('indexer_state').dropColumn('id').execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('indexer_state')
    .addColumn('id', 'serial')
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .dropConstraint('indexer_state_pkey')
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .addPrimaryKeyConstraint('indexer_state_pkey', ['id'])
    .execute();

  await db.schema
    .alterTable('indexer_state')
    .dropColumn('program_id')
    .execute();
}
