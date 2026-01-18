import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IndexerConfigService {
  public srcProgramId: string;
  public dstProgramId: string;

  public rpcUrl: string;

  public rpcSigConcurrency: number;
  public rpcTxConcurrency: number;
  public rpcBatchTxConcurrency: number;

  public rpcMaxAttempts: number;
  public rpcBaseDelayMs: number;
  public rpcMaxDelayMs: number;

  public rpcBackfillBatchSize: number;
  public rpcForwardBatchSize: number;

  constructor(configService: ConfigService) {
    this.srcProgramId = configService.getOrThrow<string>('SRC_PROGRAM_ID');
    this.dstProgramId = configService.getOrThrow<string>('DST_PROGRAM_ID');

    this.rpcUrl = configService.getOrThrow<string>('SOLANA_RPC_URL');

    this.rpcSigConcurrency = Number(
      configService.getOrThrow('RPC_SIG_CONCURRENCY'),
    );
    this.rpcTxConcurrency = Number(
      configService.getOrThrow('RPC_TX_CONCURRENCY'),
    );
    this.rpcBatchTxConcurrency = Number(
      configService.getOrThrow('RPC_BATCH_TX_CONCURRENCY'),
    );

    this.rpcMaxAttempts = Number(configService.getOrThrow('RPC_MAX_ATTEMPTS'));
    this.rpcBaseDelayMs = Number(configService.getOrThrow('RPC_BASE_DELAY_MS'));
    this.rpcMaxDelayMs = Number(configService.getOrThrow('RPC_MAX_DELAY_MS'));

    this.rpcBackfillBatchSize = Number(
      configService.getOrThrow('RPC_BACKFILL_BATCH_SIZE'),
    );
    this.rpcForwardBatchSize = Number(
      configService.getOrThrow('RPC_FORWARD_BATCH_SIZE'),
    );
  }
}
