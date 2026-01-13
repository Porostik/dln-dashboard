import { migrateToLatest } from './migrator';

async function bootstrap() {
  await migrateToLatest();
  console.log('Migrations success executed');
}

bootstrap().catch((e) => {
  console.error(`Error during execute migrations: ${e}`);
});
