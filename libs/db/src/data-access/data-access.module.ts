import { DynamicModule, Module } from '@nestjs/common';
import { Kysely } from 'kysely';
import { type DB } from '../generated/db';
import { DB_TOKEN } from 'src/db.token';
import { IndexerStateRepository } from './indexer-state.repo';
import { RawTxRepository } from './raw-tx.repo';

@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class DataAccessModule {
  static forRoot(db: Kysely<DB>): DynamicModule {
    return {
      module: DataAccessModule,
      providers: [
        { provide: DB_TOKEN, useValue: db },
        IndexerStateRepository,
        RawTxRepository,
      ],
      exports: [IndexerStateRepository, RawTxRepository],
    };
  }
}
