import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const indexer = await NestFactory.createApplicationContext(AppModule);
  await indexer.init();
  Logger.log(`🚀 Indexer started`);
}

bootstrap();
