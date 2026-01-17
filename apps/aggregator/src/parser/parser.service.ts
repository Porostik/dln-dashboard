import { Injectable } from '@nestjs/common';
import { Message, TransactionResponse } from '@solana/web3.js';
import bs58 from 'bs58';
import { AggregatorConfigService } from '../config/config.service';
import { anchorDisc, BuffReader, IX } from '../utils';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

type ParsedEvent = {
  type: 'create' | 'fulfill';
  orderId: string;
  amount: bigint;
  tokenMint: string;
};

type ParsedIxLog = {
  programId: string;
  ix: string;
  programData: Buffer[];
};

const relevantIxDisc = Object.values(IX);

@Injectable()
export class ParserService {
  constructor(private config: AggregatorConfigService) {}

  private ixDataToBuffer(data: unknown): Buffer {
    if (!data) return Buffer.alloc(0);

    if (typeof data === 'string') {
      return Buffer.from(bs58.decode(data));
    }
    if (Buffer.isBuffer(data)) return data;
    if (Array.isArray(data) || data instanceof Uint8Array)
      return Buffer.from(data);

    if (data && typeof data === 'object') {
      const d = (data as any).data;
      const type = (data as any).type;
      if (type === 'base64') return Buffer.from(d, 'base64');
      if (type === 'base58') return Buffer.from(bs58.decode(d));
      if (type === 'Buffer') return Buffer.from(data as any);
    }

    throw new Error(`Unknown ix data format ${Object.values(data).join('|')}`);
  }

  private getMessageAccountKeys(tx: TransactionResponse): string[] {
    const msg: any = tx.transaction.message;

    let keys: string[] = [];

    if (Array.isArray(msg.staticAccountKeys)) {
      keys = msg.staticAccountKeys.map((k: any) =>
        typeof k === 'string' ? k : k.toString(),
      );
    } else if (Array.isArray(msg.accountKeys)) {
      keys = msg.accountKeys.map((k: any) =>
        typeof k === 'string' ? k : k.toString(),
      );
    }

    const loaded = tx.meta?.loadedAddresses;
    if (loaded) {
      const writable = (loaded.writable ?? []).map((k: any) =>
        typeof k === 'string' ? k : k.toString(),
      );
      const readonly = (loaded.readonly ?? []).map((k: any) =>
        typeof k === 'string' ? k : k.toString(),
      );

      keys = [...keys, ...writable, ...readonly];
    }

    return keys;
  }

  private getMessageInstructions(msg: Message) {
    if (Array.isArray(msg.compiledInstructions))
      return msg.compiledInstructions;
    if (Array.isArray(msg.instructions)) return msg.instructions;
    return [];
  }

  private getRelevantInstructions(tx: TransactionResponse) {
    const msg = tx.transaction.message;
    const ixs = this.getMessageInstructions(msg);

    return ixs.filter((ix) => {
      const data = this.ixDataToBuffer(ix.data);

      return relevantIxDisc.some((d) => d.equals(data.subarray(0, 8)));
    });
  }

  private collectProgramLogs(
    logs: string[] | null,
    programIds: string[],
  ): { programId: string; lines: string[] }[] {
    if (!logs) return [];

    const frames: { programId: string; lines: string[] }[] = [];

    let current: { programId: string; lines: string[] } | null = null;

    for (const line of logs) {
      for (const pid of programIds) {
        if (line.startsWith(`Program ${pid} invoke`)) {
          current = { programId: pid, lines: [] };
          frames.push(current);
          break;
        }
      }

      if (current) {
        current.lines.push(line);
      }

      if (current && line.startsWith(`Program ${current.programId} success`)) {
        current = null;
      }
    }

    return frames;
  }

  private parseIxLogs(
    frames: { programId: string; lines: string[] }[],
  ): ParsedIxLog[] {
    const result: ParsedIxLog[] = [];

    for (const frame of frames) {
      let current: ParsedIxLog | null = null;

      for (const line of frame.lines) {
        const ixMatch = line.match(/^Program log: Instruction: (.+)$/);
        if (ixMatch) {
          if (current) result.push(current);

          current = {
            programId: frame.programId,
            ix: ixMatch[1],
            programData: [],
          };
          continue;
        }

        const dataMatch = line.match(/^Program data: (.+)$/);
        if (dataMatch && current) {
          current.programData.push(Buffer.from(dataMatch[1], 'base64'));
        }
      }

      if (current) result.push(current);
    }

    return result;
  }

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
    const relevantInstructions = this.getRelevantInstructions(tx);
    const accounts = this.getMessageAccountKeys(tx);

    if (!tx.meta?.logMessages?.length || !relevantInstructions.length)
      return [];

    const frames = this.collectProgramLogs(
      tx.meta.logMessages,
      watchedPrograms,
    );
    const ixLogs = this.parseIxLogs(frames);
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

      const data = this.ixDataToBuffer(ix.data);

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
    this.readOfferBuff(r);

    const takeToken = this.readOfferBuff(r);
    const chainId = this.chainIdToNumber(takeToken.chainId);

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

    if (this.isAllZeroBuff(takeToken.tokenAddress)) {
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
      amount: this.u256beToBigInt(takeToken.amount),
    };
  }

  private u256beToBigInt(b: Buffer) {
    if (b.length !== 32) throw new Error('chainId must be 32 bytes');
    return BigInt('0x' + b.toString('hex'));
  }

  private chainIdToNumber(chainId32: Buffer) {
    const v = this.u256beToBigInt(chainId32);
    if (v > BigInt(Number.MAX_SAFE_INTEGER)) return Number.NaN;
    return Number(v);
  }

  private readOfferBuff(r: BuffReader) {
    const chainId = r.fixed(32);
    const tokenAddress = r.bytes();
    const amount = r.fixed(32);

    return {
      chainId,
      tokenAddress,
      amount,
    };
  }

  private parseCreate(data: Buffer, logs: Buffer[]): ParsedEvent | null {
    const foundedOrderId = this.parseCreateOrderIdEvent(logs);
    const orderCreatedEvent = this.parseCreateOrderEvent(logs);
    const amount = this.parseCreateOrderAmount(data);

    if (!foundedOrderId || !orderCreatedEvent) return null;

    return {
      type: 'create',
      tokenMint: orderCreatedEvent.tokenMint,
      orderId: foundedOrderId,
      amount,
    };
  }

  private parseCreateOrderIdEvent(logsBuff: Buffer[]): string | null {
    const eventName = anchorDisc('CreatedOrderId', 'event');

    for (const buffLine of logsBuff) {
      if (buffLine.length < 8 + 32) {
        continue;
      }
      const disc = buffLine.subarray(0, 8);
      if (!disc.equals(eventName)) {
        continue;
      }
      const orderIdBytes = buffLine.subarray(8, 8 + 32);
      return orderIdBytes.toString('hex');
    }

    return null;
  }

  private parseCreateOrderEvent(
    logsBuff: Buffer[],
  ): { tokenMint: string } | null {
    const eventName = anchorDisc('CreatedOrder', 'event');

    for (const buffLine of logsBuff) {
      if (buffLine.length < 8 + 32) {
        continue;
      }
      const disc = buffLine.subarray(0, 8);
      if (!disc.equals(eventName)) {
        continue;
      }

      const r = new BuffReader(buffLine, 8);

      // makerOrderNonce
      r.u64();
      // makerSrc
      r.bytes();

      const giveOffer = this.readOfferBuff(r);

      let tokenMint: string | null;

      if (this.isAllZeroBuff(giveOffer.tokenAddress)) {
        tokenMint = SOL_MINT;
      } else {
        tokenMint =
          giveOffer.tokenAddress.length === 32
            ? bs58.encode(giveOffer.tokenAddress)
            : null;
      }

      if (!tokenMint) return null;

      return { tokenMint };
    }

    return null;
  }

  private parseCreateOrderAmount(data: Buffer): bigint {
    return data.readBigUInt64LE(8);
  }

  private isAllZeroBuff(buf: Buffer) {
    for (const b of buf) if (b !== 0) return false;
    return true;
  }
}
