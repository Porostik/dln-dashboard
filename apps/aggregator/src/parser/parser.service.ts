import { Injectable } from '@nestjs/common';
import { TransactionResponse } from '@solana/web3.js';
import bs58 from 'bs58';
import { AggregatorConfigService } from '../config/config.service';
import {
  BuffReader,
  collectProgramLogs,
  parseIxLogs,
  ParsedIxLog,
  getRelevantInstructions,
  getMessageAccountKeys,
  IX,
  ixDataToBuffer,
  readOfferBuff,
  chainIdToNumber,
  u256beToBigInt,
  parseCreateOrderAmount,
  parseCreateOrderEvent,
  parseCreateOrderIdEvent,
  isAllZeroBuff,
} from './helpers';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

type ParsedEvent = {
  type: 'create' | 'fulfill';
  orderId: string;
  amount: bigint;
  tokenMint: string;
};

@Injectable()
export class ParserService {
  constructor(private config: AggregatorConfigService) {}

  private takeNextIxLog(
    ixLogs: ParsedIxLog[],
    fromIdx: number,
    programId: string,
    wanted: string[],
  ): { log: ParsedIxLog; nextIdx: number } | null {
    for (let i = fromIdx; i < ixLogs.length; i++) {
      const l = ixLogs[i];
      if (l.programId !== programId) continue;
      if (!wanted.includes(l.ix)) continue;
      return { log: l, nextIdx: i + 1 };
    }
    return null;
  }

  public parseTx(tx: TransactionResponse): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    const watchedPrograms = [
      this.config.srcProgramId,
      this.config.dstProgramId,
    ];
    const relevantInstructions = getRelevantInstructions(tx, Object.values(IX));
    const accounts = getMessageAccountKeys(tx);

    if (!tx.meta?.logMessages?.length || !relevantInstructions.length)
      return [];

    const frames = collectProgramLogs(tx.meta.logMessages, watchedPrograms);
    const ixLogs = parseIxLogs(frames);
    if (!ixLogs.length) return [];

    let logCursor = 0;

    for (const ix of relevantInstructions) {
      const programId = accounts[ix.programIdIndex]?.toString();
      if (!watchedPrograms.includes(programId)) continue;

      const picked = this.takeNextIxLog(ixLogs, logCursor, programId, [
        'CreateOrder',
        'CreateOrderWithNonce',
        'FulfillOrder',
      ]);
      if (!picked) continue;

      logCursor = picked.nextIdx;

      const data = ixDataToBuffer(ix.data);

      if (
        picked.log.ix === 'CreateOrder' ||
        picked.log.ix === 'CreateOrderWithNonce'
      ) {
        const ev = this.parseCreate(data, picked.log.programData);

        if (ev) events.push(ev);
      } else if (picked.log.ix === 'FulfillOrder') {
        const ev = this.parseFulfill(data);
        if (ev) events.push(ev);
      }
    }

    return events;
  }

  private parseFulfill(ixData: Buffer): ParsedEvent | null {
    const r = new BuffReader(ixData, 8);

    r.u64();
    // makeSrc
    r.bytes();

    // giveOffer
    readOfferBuff(r);

    const takeToken = readOfferBuff(r);
    const chainId = chainIdToNumber(takeToken.chainId);

    if (chainId !== 7565164) return null;

    // receiverDst
    r.bytes();
    // givePatchAuthoritySrc
    r.bytes();
    // orderAuthorityAddressDst
    r.bytes();
    // allowedTakerDst
    r.option(() => r.bytes());
    // allowedCancelBeneficiarySrc
    r.option(() => r.bytes());
    // externalCall
    r.option(() => ({
      externalCallShortcut: r.fixed(32),
    }));

    const orderId = r.fixed(32).toString('hex');

    let tokenMint: string | null;

    if (isAllZeroBuff(takeToken.tokenAddress)) {
      tokenMint = SOL_MINT;
    } else {
      tokenMint =
        takeToken.tokenAddress.length === 32
          ? bs58.encode(takeToken.tokenAddress)
          : null;
    }

    if (!tokenMint) return null;

    return {
      type: 'fulfill',
      orderId,
      tokenMint,
      amount: u256beToBigInt(takeToken.amount),
    };
  }

  private parseCreate(data: Buffer, logs: Buffer[]): ParsedEvent | null {
    const foundedOrderId = parseCreateOrderIdEvent(logs);
    const orderCreatedEvent = parseCreateOrderEvent(logs);
    const amount = parseCreateOrderAmount(data);

    if (!foundedOrderId || !orderCreatedEvent) return null;

    return {
      type: 'create',
      tokenMint: orderCreatedEvent.tokenMint,
      orderId: foundedOrderId,
      amount,
    };
  }
}
