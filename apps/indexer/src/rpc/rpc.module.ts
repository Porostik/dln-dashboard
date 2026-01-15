import { Module } from '@nestjs/common';
import { RpcService } from './rpc.service';
import { RpcPolicyService } from './rpc-policy.service';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    RpcService,
    {
      provide: RpcPolicyService,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new RpcPolicyService({
          maxAttempts: config.rpc_max_attempts,
          baseDelay: config.rpc_base_delay_ms,
          maxDelay: config.rpc_max_delay_ms,
          concurrency: {
            sig: config.rpc_sig_concurrency,
            tx: config.rpc_tx_concurrency,
            batchTx: config.rpc_batch_tx_concurrency,
          },
        }),
    },
  ],
  exports: [RpcService],
})
export class RpcModule {}
