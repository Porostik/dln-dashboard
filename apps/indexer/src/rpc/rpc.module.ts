import { Module } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { RpcPolicyService } from './rpc-policy.service';
import { IndexerConfigModule } from '../config/config.module';
import { IndexerConfigService } from '../config/config.service';

@Module({
  imports: [IndexerConfigModule],
  providers: [
    RpcService,
    {
      provide: RpcPolicyService,
      inject: [IndexerConfigService],
      useFactory: (config: IndexerConfigService) =>
        new RpcPolicyService({
          maxAttempts: config.rpcMaxAttempts,
          baseDelay: config.rpcBaseDelayMs,
          maxDelay: config.rpcMaxDelayMs,
          concurrency: {
            sig: config.rpcSigConcurrency,
            tx: config.rpcTxConcurrency,
            batchTx: config.rpcBatchTxConcurrency,
          },
        }),
    },
  ],
  exports: [RpcService],
})
export class RpcModule {}
