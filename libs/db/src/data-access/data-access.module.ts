import { DynamicModule, Global, Module } from '@nestjs/common';
import { Kysely } from 'kysely';
import { type DB } from '../generated/db';
import { DB_TOKEN } from '../db.token';
import { IndexerStateRepository } from './indexer-state.repo';
import { RawTxRepository } from './raw-tx.repo';
import { PipelineStateRepository } from './pipeline-state.repo';
import { IndexerIngestionRepository } from './indexer-ingestion.repo';

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
        PipelineStateRepository,
        IndexerIngestionRepository,
      ],
      exports: [
        IndexerStateRepository,
        RawTxRepository,
        PipelineStateRepository,
        IndexerIngestionRepository,
      ],
    };
  }
}
