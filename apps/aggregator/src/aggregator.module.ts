import { DataAccessModule, db } from '@dln-dashboard/data-access';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { AggregationModule } from './aggregation/aggregation.module';

@Module({
  imports: [
    DataAccessModule.forRoot(db),
    ConfigModule.forRoot(),
    AggregationModule,
    RedisModule,
  ],
})
export class AggregatorModule {}
