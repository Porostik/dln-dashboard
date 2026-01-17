import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AggregatorModule } from './aggregator.module';
import { RunnerService } from './aggregation/runner.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AggregatorModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const runner = app.get(RunnerService);
  runner.start();

  Logger.log('🚀 Aggregator started');

  await new Promise(() => void 0);
}

bootstrap().catch((e) => {
  console.error('FATAL bootstrap error', e);
  process.exit(1);
});
