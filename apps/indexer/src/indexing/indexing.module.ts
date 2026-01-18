import { Module, Scope } from '@nestjs/common';
import {
  DataAccessModule,
  IndexerIngestionRepository,
  IndexerStateRepository,
} from '@dln-dashboard/data-access';
import { Runner } from './runner.service';
import { DST_SOURCE, SRC_SOURCE } from './tokens';
import { RpcService } from '../rpc/rpc.service';
import { IndexerConfigService } from '../config/config.service';
import { SourceService } from './source.service';
import { IndexerConfigModule } from '../config/config.module';
import { RpcModule } from '../rpc/rpc.module';

@Module({
  imports: [RpcModule, DataAccessModule, IndexerConfigModule],
  providers: [
    Runner,
    {
      provide: SRC_SOURCE,
      scope: Scope.TRANSIENT,
      inject: [
        RpcService,
        IndexerStateRepository,
        IndexerIngestionRepository,
        IndexerConfigService,
      ],
      useFactory: (
        rpc: RpcService,
        stateRepo: IndexerStateRepository,
        indexerIngestionRepo: IndexerIngestionRepository,
        config: IndexerConfigService,
      ) =>
        new SourceService(
          rpc,
          {
            programId: config.srcProgramId,
            backfillBatchSize: config.rpcBackfillBatchSize,
            forwardBatchSize: config.rpcForwardBatchSize,
          },
          stateRepo,
          indexerIngestionRepo,
          config,
        ),
    },
    {
      provide: DST_SOURCE,
      scope: Scope.TRANSIENT,
      inject: [
        RpcService,
        IndexerStateRepository,
        IndexerIngestionRepository,
        IndexerConfigService,
      ],
      useFactory: (
        rpc: RpcService,
        stateRepo: IndexerStateRepository,
        indexerIngestionRepo: IndexerIngestionRepository,
        config: IndexerConfigService,
      ) =>
        new SourceService(
          rpc,
          {
            programId: config.dstProgramId,
            backfillBatchSize: config.rpcBackfillBatchSize,
            forwardBatchSize: config.rpcForwardBatchSize,
          },
          stateRepo,
          indexerIngestionRepo,
          config,
        ),
    },
  ],
})
export class IndexingModule {}
