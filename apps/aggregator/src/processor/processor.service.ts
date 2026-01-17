import { Injectable, Logger } from '@nestjs/common';
import { ParserService } from '../parser/parser.service';
import { PriceService } from '../price/price.service';
import {
  DayStatsRepository,
  EventType,
  OrderEventRepository,
  OrderEvents,
  RawTxRepository,
} from '@dln-dashboard/data-access';
import { TransactionResponse } from '@solana/web3.js';
import pLimit from 'p-limit';
import Decimal from 'decimal.js';
import { RelevantInstructionsNotFound } from '../error';
import { Insertable } from 'kysely';

type Processed = {
  amount: string;
  block_time: string | number | bigint;
  day: Date;
  order_id: string;
  signature: string;
  slot: string | number | bigint;
  token_mint: string;
  type: EventType;
};

@Injectable()
export class ProcessorService {
  private logger = new Logger(ProcessorService.name);

  constructor(
    private parser: ParserService,
    private price: PriceService,
    private rawTxRepo: RawTxRepository,
  ) {}

  async process(sig: string): Promise<Processed[]> {
    const raw = await this.rawTxRepo.getBySignatures(sig);

    if (!raw) throw Error('Raw tx not found');

    const tx = raw.tx_data as unknown as TransactionResponse;

    const blockTime = this.pickBlockTime(raw.block_time, tx);
    if (!blockTime) throw Error('blockTime not found');

    const day = this.dayKeyFromBlockTime(blockTime);

    try {
      const events = this.parser.parseTx(tx);

      if (!events.length) throw new RelevantInstructionsNotFound();

      const limiter = pLimit(5);

      return await Promise.all(
        events.map((e) =>
          limiter(async () => {
            try {
              const price = await this.price.getDailyPriceUsd(
                e.tokenMint,
                day.toISOString(),
              );

              if (!price) throw new Error('Price not found');

              const amount = this.calcUsd(
                e.amount,
                String(price.price),
                price.decimals,
              );

              return {
                signature: sig,
                block_time: blockTime,
                slot: raw.slot,
                type: e.type,
                day,
                order_id: e.orderId,
                token_mint: e.tokenMint,
                amount: String(amount),
              };
            } catch (err) {
              this.logger.error({ err, sig }, 'Error during process tx');
              throw err;
            }
          }),
        ),
      );
    } catch (err) {
      throw err;
    }
  }
  private pickBlockTime(
    dbBlockTime: unknown,
    tx: TransactionResponse,
  ): number | null {
    if (dbBlockTime !== null && dbBlockTime !== undefined) {
      const n = Number(dbBlockTime);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (typeof tx.blockTime === 'number' && tx.blockTime > 0)
      return tx.blockTime;
    return null;
  }

  private dayKeyFromBlockTime(blockTime: number): Date {
    const d = new Date(blockTime * 1000);
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private calcUsd(amountRaw: bigint, priceUsd: string, decimals: number) {
    const amount = new Decimal(amountRaw.toString());
    const scale = new Decimal(10).pow(decimals);
    return amount.div(scale).mul(priceUsd).toFixed(2);
  }
}
