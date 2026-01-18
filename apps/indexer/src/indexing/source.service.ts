import { Injectable, Logger } from '@nestjs/common';
import {
  ConfirmedSignatureInfo,
  PublicKey,
  TransactionResponse,
} from '@solana/web3.js';
import { RpcService } from '../rpc/rpc.service';
import {
  IndexerIngestionRepository,
  IndexerStateRepository,
} from '@dln-dashboard/data-access';
import { JsonValue, IndexerMode } from '@dln-dashboard/data-access';
import pLimit from 'p-limit';
import { IndexerConfigService } from '../config/config.service';

type SourceConfig = {
  backfillBatchSize: number;
  forwardBatchSize: number;
  programId: string;
};

@Injectable()
export class SourceService {
  private program: PublicKey;
  private cursor: string | null = null;
  private mode: IndexerMode | null = null;
  private logger = new Logger(SourceService.name);
  private isStopped = false;
  private emptyPagesInARow = 0;

  constructor(
    private rpc: RpcService,
    private config: SourceConfig,
    private stateRepository: IndexerStateRepository,
    private ingestionRepository: IndexerIngestionRepository,
    private indexerConfig: IndexerConfigService,
  ) {
    this.program = new PublicKey(config.programId);
  }

  public async init(mode: IndexerMode) {
    try {
      const state = await this.stateRepository.getOrCreate(
        this.config.programId,
        mode,
      );
      if (!state) {
        this.logger.error(
          { programId: this.config.programId },
          'Error fetching indexing state',
        );
      } else {
        this.cursor = state?.cursor;
        this.mode = state?.mode;
        this.isStopped = !!state?.is_stopped;
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error fetching indexing state',
      );
    }
  }

  public async stop() {
    if (this.mode) {
      await this.stateRepository.stop(this.config.programId, this.mode);
      this.isStopped = false;
      return true;
    }
    return false;
  }

  public async tick() {
    if (this.isStopped) return null;

    if (this.mode === 'default') {
      return this.tickForward();
    } else if (this.mode === 'backfill') {
      return this.tickBackfill();
    }

    return null;
  }

  private async tickForward(): Promise<{
    status: 'processed' | 'failed' | 'empty';
    newCursor?: string;
    programId: string;
  }> {
    try {
      const sigs = await this.fetchSigs({
        until: this.cursor ?? undefined,
        limit: this.config.forwardBatchSize,
      });

      if (!sigs.length)
        return { status: 'empty', programId: this.config.programId };

      const txs = await this.fetchTxs(sigs);

      if (!txs.length) {
        return { status: 'empty', programId: this.config.programId };
      }

      const lastSig = sigs[0]!.signature;

      if (lastSig) {
        await this.ingestionRepository.ingresPage(txs, this.config.programId, {
          forward: lastSig,
        });
        this.cursor = lastSig;
        return {
          status: 'processed',
          programId: this.config.programId,
          newCursor: lastSig,
        };
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error during indexing tx page',
      );
      return {
        programId: this.config.programId,
        status: 'failed',
      };
    }

    return {
      programId: this.config.programId,
      status: 'failed',
    };
  }

  private async tickBackfill(): Promise<{
    status: 'processed' | 'exhausted' | 'failed' | 'empty';
    newCursor?: string;
    programId: string;
  }> {
    try {
      const sigs = await this.fetchSigs({
        before: this.cursor ?? undefined,
        limit: this.config.backfillBatchSize,
      });

      if (!sigs.length)
        return { status: 'exhausted', programId: this.config.programId };

      const txs = await this.fetchTxs(sigs);

      if (!txs.length && this.emptyPagesInARow < 5) {
        this.emptyPagesInARow += 1;
        return { status: 'empty', programId: this.config.programId };
      }

      const lastSig = sigs.at(-1)!.signature;

      if (lastSig) {
        await this.ingestionRepository.ingresPage(txs, this.config.programId, {
          backfill: lastSig,
        });
        this.emptyPagesInARow = 0;
        this.cursor = lastSig;
        return {
          status: 'processed',
          newCursor: lastSig,
          programId: this.config.programId,
        };
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error during indexing tx page',
      );
      return {
        status: 'failed',
        programId: this.config.programId,
      };
    }

    return {
      status: 'failed',
      programId: this.config.programId,
    };
  }

  private async fetchSigs(options: {
    before?: string;
    until?: string;
    limit?: number;
  }) {
    return await this.rpc.getSignaturesForAddress(
      this.program,
      options,
      'finalized',
    );
  }

  private async fetchTxs(sigs: ConfirmedSignatureInfo[]) {
    const txs: {
      signature: string;
      tx_data: JsonValue;
      block_time: number;
      slot: number;
    }[] = [];

    const limiter = pLimit(this.indexerConfig.rpcTxConcurrency);

    await Promise.all(
      sigs.map((sig, idx) =>
        limiter(async () => {
          const tx = await this.rpc.getTransaction(sig.signature, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0,
          });
          if (tx) txs.push(this.processRpcTx(sigs, tx, idx));
        }),
      ),
    );

    return txs;
  }

  private processRpcTx(
    sigs: ConfirmedSignatureInfo[],
    tx: TransactionResponse,
    idx: number,
  ) {
    return {
      signature: sigs[idx].signature,
      tx_data: tx as unknown as JsonValue,
      block_time: tx.blockTime ?? 0,
      slot: tx.slot,
    };
  }
}
