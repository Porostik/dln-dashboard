import { Injectable, Logger } from '@nestjs/common';
import {
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  PublicKey,
  TransactionResponse,
} from '@solana/web3.js';
import { RpcService } from '../rpc/rpc.service';
import {
  IndexerIngestionRepository,
  IndexerStateRepository,
} from '@dln-dashboard/data-access';
import { JsonValue } from '@dln-dashboard/data-access';

type SourceConfig = {
  backfillBatchSize: number;
  forwardBatchSize: number;
  programId: string;
};

@Injectable()
export class SourceService {
  private program: PublicKey;
  private cursorBackfill: string | null = null;
  private cursorForward: string | null = null;
  private logger = new Logger(SourceService.name);
  private emptyPagesInARow = 0;

  constructor(
    private rpc: RpcService,
    private config: SourceConfig,
    private stateRepository: IndexerStateRepository,
    private ingestionRepository: IndexerIngestionRepository,
  ) {
    this.program = new PublicKey(config.programId);
  }

  public async init() {
    try {
      const state = await this.stateRepository.getOrCreate(
        this.config.programId,
      );
      if (!state) {
        this.logger.error(
          { programId: this.config.programId },
          'Error fetching indexing state',
        );
      } else {
        this.cursorBackfill = state?.backfill_cursor;
        this.cursorForward = state?.forward_cursor;
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error fetching indexing state',
      );
    }
  }

  public async tickForward(): Promise<{
    status: 'processed' | 'failed' | 'empty';
    newCursor?: string;
  }> {
    try {
      const sigs = await this.fetchSigs({
        until: this.cursorForward ?? undefined,
        limit: this.config.forwardBatchSize,
      });

      if (!sigs.length) return { status: 'empty' };

      const txs = await this.fetchTxs(sigs);

      if (!txs.length) {
        return { status: 'empty' };
      }

      const lastSig = sigs[0]!.signature;

      if (lastSig) {
        await this.ingestionRepository.ingresPage(txs, this.config.programId, {
          forward: lastSig,
        });
        this.cursorForward = lastSig;
        return {
          status: 'processed',
          newCursor: lastSig,
        };
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error during indexing tx page',
      );
      return {
        status: 'failed',
      };
    }

    return {
      status: 'failed',
    };
  }

  public async tickBackfill(): Promise<{
    status: 'processed' | 'exhausted' | 'failed' | 'empty';
    newCursor?: string;
  }> {
    try {
      const sigs = await this.fetchSigs({
        before: this.cursorBackfill ?? undefined,
        limit: this.config.backfillBatchSize,
      });

      if (!sigs.length) return { status: 'exhausted' };

      const txs = await this.fetchTxs(sigs);

      if (!txs.length && this.emptyPagesInARow < 20) {
        this.emptyPagesInARow += 1;
        return { status: 'empty' };
      }

      const lastSig = sigs.at(-1)!.signature;

      if (lastSig) {
        await this.ingestionRepository.ingresPage(txs, this.config.programId, {
          backfill: lastSig,
        });
        this.emptyPagesInARow = 0;
        this.cursorBackfill = lastSig;
        return {
          status: 'processed',
          newCursor: lastSig,
        };
      }
    } catch (err) {
      this.logger.error(
        { err, programId: this.config.programId },
        'Error during indexing tx page',
      );
      return {
        status: 'failed',
      };
    }

    return {
      status: 'failed',
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

    let idx = 0;

    for (const sig of sigs) {
      const tx = await this.rpc.getTransaction(sig.signature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });
      if (tx) txs.push(this.processRpcTx(sigs, tx, idx));
      idx += 1;
    }

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
