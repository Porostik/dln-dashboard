import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DashboardModule } from './dashboard/dashboard.module';

async function bootstrap() {
  const app = await NestFactory.create(DashboardModule);
  app.enableCors({
    origin: ['http://localhost:5173'],
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
