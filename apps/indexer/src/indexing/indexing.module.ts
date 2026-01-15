import { Module } from '@nestjs/common';
import {
  DataAccessModule,
  IndexerIngestionRepository,
  IndexerStateRepository,
} from '@dln-dashboard/data-access';
import { Runner } from './runner.service';
import { DST_SOURCE, SRC_SOURCE } from './tokens';
import { RpcService } from '../rpc/rpc.service';
import { AppConfigService } from '../config/config.service';
import { SourceService } from './source.service';
import { AppConfigModule } from '../config/config.module';
import { RpcModule } from '../rpc/rpc.module';

@Module({
  imports: [RpcModule, DataAccessModule, AppConfigModule],
  providers: [
    Runner,
    {
      provide: SRC_SOURCE,
      inject: [
        RpcService,
        IndexerStateRepository,
        IndexerIngestionRepository,
        AppConfigService,
      ],
      useFactory: (
        rpc: RpcService,
        stateRepo: IndexerStateRepository,
        indexerIngestionRepo: IndexerIngestionRepository,
        config: AppConfigService,
      ) =>
        new SourceService(
          rpc,
          {
            programId: config.srcProgramId,
            backfillBatchSize: config.rpc_backfill_batch_size,
            forwardBatchSize: config.rpc_forward_batch_size,
          },
          stateRepo,
          indexerIngestionRepo,
        ),
    },
    {
      provide: DST_SOURCE,
      inject: [
        RpcService,
        IndexerStateRepository,
        IndexerIngestionRepository,
        AppConfigService,
      ],
      useFactory: (
        rpc: RpcService,
        stateRepo: IndexerStateRepository,
        indexerIngestionRepo: IndexerIngestionRepository,
        config: AppConfigService,
      ) =>
        new SourceService(
          rpc,
          {
            programId: config.dstProgramId,
            backfillBatchSize: config.rpc_backfill_batch_size,
            forwardBatchSize: config.rpc_forward_batch_size,
          },
          stateRepo,
          indexerIngestionRepo,
        ),
    },
  ],
})
export class IndexingModule {}
