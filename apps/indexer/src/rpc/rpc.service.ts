import { Injectable } from '@nestjs/common';
import { Connection } from '@solana/web3.js';
import { IndexerConfigService } from '../config/config.service';
import { RpcPolicyService } from './rpc-policy.service';

@Injectable()
export class RpcService {
  connection: Connection;

  constructor(
    config: IndexerConfigService,
    private policyService: RpcPolicyService,
  ) {
    this.connection = new Connection(config.rpcUrl, {
      disableRetryOnRateLimit: true,
    });
  }

  public async getSignaturesForAddress(
    ...args: Parameters<typeof this.connection.getSignaturesForAddress>
  ) {
    return await this.policyService.run('sig', () =>
      this.connection.getSignaturesForAddress(...args),
    );
  }

  public async getTransactions(
    ...args: Parameters<typeof this.connection.getParsedTransactions>
  ) {
    return await this.policyService.run('batchTx', () =>
      this.connection.getParsedTransactions(...args),
    );
  }

  public async getTransaction(
    ...args: Parameters<typeof this.connection.getTransaction>
  ) {
    return await this.policyService.run('tx', () =>
      this.connection.getTransaction(...args),
    );
  }
}
