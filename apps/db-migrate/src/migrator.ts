import { Kysely, Migrator } from 'kysely';
import { db } from '@dln-dashboard/data-access';
import { migrations } from './migrations';

export async function migrateToLatest() {
  const migrator = new Migrator({
    db: db as unknown as Kysely<any>,
    provider: {
      async getMigrations() {
        return migrations;
      },
    },
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}
