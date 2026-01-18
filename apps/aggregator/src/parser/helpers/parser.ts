import bs58 from 'bs58';
import { anchorDisc } from './anchor-disc';
import { BuffReader } from './buff-reader';
import { SOL_MINT } from './constants';

export const u256beToBigInt = (b: Buffer) => {
  if (b.length !== 32) throw new Error('chainId must be 32 bytes');
  return BigInt('0x' + b.toString('hex'));
};

export const chainIdToNumber = (chainId32: Buffer) => {
  const v = u256beToBigInt(chainId32);
  if (v > BigInt(Number.MAX_SAFE_INTEGER)) return Number.NaN;
  return Number(v);
};

export const readOfferBuff = (r: BuffReader) => {
  const chainId = r.fixed(32);
  const tokenAddress = r.bytes();
  const amount = r.fixed(32);

  return {
    chainId,
    tokenAddress,
    amount,
  };
};

export const parseCreateOrderIdEvent = (logsBuff: Buffer[]): string | null => {
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
};

export const parseCreateOrderEvent = (
  logsBuff: Buffer[],
): { tokenMint: string } | null => {
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

    const giveOffer = readOfferBuff(r);

    let tokenMint: string | null;

    if (isAllZeroBuff(giveOffer.tokenAddress)) {
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
};

export const parseCreateOrderAmount = (data: Buffer): bigint => {
  return data.readBigUInt64LE(8);
};

export const isAllZeroBuff = (buf: Buffer) => {
  for (const b of buf) if (b !== 0) return false;
  return true;
};
