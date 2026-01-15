import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  public srcProgramId: string;
  public dstProgramId: string;
  public rpc_url: string;
  public rpc_sig_concurrency: number;
  public rpc_tx_concurrency: number;
  public rpc_batch_tx_concurrency: number;
  public rpc_max_attempts: number;
  public rpc_base_delay_ms: number;
  public rpc_max_delay_ms: number;
  public rpc_backfill_batch_size: number;
  public rpc_forward_batch_size: number;

  constructor(configService: ConfigService) {
    this.srcProgramId = configService.getOrThrow<string>('SRC_PROGRAM_ID');
    this.dstProgramId = configService.getOrThrow<string>('DST_PROGRAM_ID');
    this.rpc_url = configService.getOrThrow<string>('SOLANA_RPC_URL');
    this.rpc_sig_concurrency = Number(
      configService.getOrThrow<number>('RPC_SIG_CONCURRENCY'),
    );
    this.rpc_tx_concurrency = Number(
      configService.getOrThrow<number>('RPC_TX_CONCURRENCY'),
    );
    this.rpc_batch_tx_concurrency = Number(
      configService.getOrThrow<number>('RPC_BATCH_TX_CONCURRENCY'),
    );
    this.rpc_max_attempts = Number(
      configService.getOrThrow<number>('RPC_MAX_ATTEMPTS'),
    );
    this.rpc_base_delay_ms = Number(
      configService.getOrThrow<number>('RPC_BASE_DELAY_MS'),
    );
    this.rpc_max_delay_ms = Number(
      configService.getOrThrow<number>('RPC_MAX_DELAY_MS'),
    );
    this.rpc_backfill_batch_size = Number(
      configService.getOrThrow<number>('RPC_BACKFILL_BATCH_SIZE'),
    );
    this.rpc_forward_batch_size = Number(
      configService.getOrThrow<number>('RPC_FORWARD_BATCH_SIZE'),
    );
  }
}
