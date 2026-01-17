import { DynamicModule, Global, Module } from '@nestjs/common';
import { Kysely } from 'kysely';
import { type DB } from '../generated/db';
import { DB_TOKEN } from '../db.token';
import { IndexerStateRepository } from './indexer-state.repo';
import { RawTxRepository } from './raw-tx.repo';
import { IndexerIngestionRepository } from './indexer-ingestion.repo';
import { OrderEventRepository } from './order-event.repo';
import { DayStatsRepository } from './day-stats.repo';
import { AggregationJobsRepository } from './aggregation-jobs.repo';

@Global()
@Module({})
export class DataAccessModule {
  static forRoot(db: Kysely<DB>): DynamicModule {
    return {
      global: true,
      module: DataAccessModule,
      providers: [
        { provide: DB_TOKEN, useValue: db },
        IndexerStateRepository,
        RawTxRepository,
        IndexerIngestionRepository,
        AggregationJobsRepository,
        OrderEventRepository,
        DayStatsRepository,
      ],
      exports: [
        IndexerStateRepository,
        RawTxRepository,
        IndexerIngestionRepository,
        AggregationJobsRepository,
        OrderEventRepository,
        DayStatsRepository,
      ],
    };
  }
}
