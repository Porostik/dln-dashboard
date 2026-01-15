import { Module } from '@nestjs/common';
import { DataAccessModule, db } from '@dln-dashboard/data-access';
import { ConfigModule } from '@nestjs/config';
import { IndexingModule } from './indexing/indexing.module';

@Module({
  imports: [
    DataAccessModule.forRoot(db),
    ConfigModule.forRoot(),
    IndexingModule,
  ],
})
export class IndexerModule {}
