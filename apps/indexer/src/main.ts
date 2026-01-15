import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IndexerModule } from './indexer.module';
import { Runner } from './indexing/runner.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(IndexerModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const runner = app.get(Runner);
  runner.start();

  Logger.log('🚀 Indexer started');

  await new Promise(() => void 0);
}

bootstrap().catch((e) => {
  console.error('FATAL bootstrap error', e);
  process.exit(1);
});
