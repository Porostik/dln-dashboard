import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IndexerModule } from './indexer.module';
import { Runner } from './indexing/runner.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(IndexerModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const runnerBackfill = await app.resolve(Runner);
  const runnerForward = await app.resolve(Runner);

  await Promise.all([
    runnerBackfill.start('backfill'),
    runnerForward.start('default'),
  ]);

  Logger.log('🚀 Indexer started');
}

bootstrap().catch((e) => {
  console.error('FATAL bootstrap error', e);
  process.exit(1);
});
