import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.executeQuery(
    sql`ALTER TYPE aggregation_status ADD VALUE 'skipped';`.compile(db),
  );
}

export async function down(): Promise<void> {
  //
}
