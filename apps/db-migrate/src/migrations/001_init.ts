import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createType('indexer_mode')
    .asEnum(['backfill', 'default'])
    .execute();

  await db.schema
    .createTable('indexer_state')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('last_processed_sig', 'text', (col) => col.notNull())
    .addColumn('mode', sql`indexer_mode`, (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('raw_tx')
    .ifNotExists()
    .addColumn('signature', 'text', (col) => col.primaryKey())
    .addColumn('tx_data', 'jsonb', (col) => col.notNull())
    .addColumn('slot', 'bigint', (col) => col.notNull())
    .addColumn('block_time', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createType('aggregation_status')
    .asEnum(['pending', 'processing', 'done', 'failed'])
    .execute();

  await db.schema
    .createTable('aggregation_jobs')
    .ifNotExists()
    .addColumn('signature', 'text', (col) => col.primaryKey())
    .addForeignKeyConstraint(
      'aggregation_jobs_signature_fk',
      ['signature'],
      'raw_tx',
      ['signature'],
    )
    .addColumn('status', sql`aggregation_status`, (col) =>
      col.notNull().defaultTo('pending'),
    )
    .addColumn('locked_by', 'text')
    .addColumn('locked_until', 'timestamptz')
    .addColumn('attempts', 'numeric', (col) => col.defaultTo(sql`0`))
    .addColumn('next_retry_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('aggregation_jobs_poll_status')
    .on('aggregation_jobs')
    .column('status')
    .execute();

  await db.schema
    .createIndex('aggregation_jobs_poll_next_retry_at')
    .on('aggregation_jobs')
    .column('next_retry_at')
    .execute();

  await db.schema
    .createType('event_type')
    .asEnum(['create', 'fulfill'])
    .execute();

  await db.schema
    .createTable('order_events')
    .ifNotExists()
    .addColumn('order_id', 'text', (col) => col.notNull())
    .addColumn('type', sql`event_type`, (col) => col.notNull())
    .addPrimaryKeyConstraint('order_id_pk', ['order_id', 'type'])
    .addColumn('signature', 'text', (col) => col.notNull())
    .addColumn('slot', 'bigint', (col) => col.notNull())
    .addColumn('block_time', 'bigint', (col) => col.notNull())
    .addColumn('token_mint', 'text', (col) => col.notNull())
    .addColumn('amount', 'text', (col) => col.notNull())
    .addColumn('day', 'date', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('order_events_day')
    .on('order_events')
    .column('day')
    .execute();

  await db.schema
    .createTable('daily_stats')
    .ifNotExists()
    .addColumn('day', 'date', (col) => col.primaryKey())
    .addColumn('created_volume_usd', 'numeric', (col) =>
      col.notNull().defaultTo(sql`0`),
    )
    .addColumn('fulfilled_volume_usd', 'numeric', (col) =>
      col.notNull().defaultTo(sql`0`),
    )
    .addColumn('created_count', 'numeric', (col) =>
      col.notNull().defaultTo(sql`0`),
    )
    .addColumn('fulfilled_count', 'numeric', (col) =>
      col.notNull().defaultTo(sql`0`),
    )
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('indexer_state').execute();
  await db.schema.dropTable('raw_tx').execute();
  await db.schema.dropTable('aggregation_jobs').execute();
  await db.schema.dropTable('order_events').execute();
  await db.schema.dropTable('daily_stats').execute();
}
