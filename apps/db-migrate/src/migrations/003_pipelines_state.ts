import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('pipeline_state')
    .ifNotExists()
    .addColumn('id', 'smallint', (col) => col.primaryKey().defaultTo(sql`1`))
    .addColumn('backfill_done', 'boolean', (col) =>
      col.notNull().defaultTo(sql`false`),
    )
    .addColumn('created_count', 'bigint', (col) =>
      col.notNull().defaultTo(sql`0`),
    )
    .addColumn('fulfilled_count', 'bigint', (col) =>
      col
        .notNull()
        .notNull()
        .defaultTo(sql`0`),
    )
    .addColumn('created_target', 'bigint', (col) =>
      col.notNull().defaultTo(sql`25000`),
    )
    .addColumn('fulfilled_target', 'bigint', (col) =>
      col.notNull().defaultTo(sql`25000`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db
    .insertInto('pipeline_state')
    .values({ id: 1 })
    .onConflict((oc) => oc.doNothing())
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('pipeline_state').execute();
}
