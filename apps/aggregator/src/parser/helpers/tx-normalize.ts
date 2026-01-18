import { Message, TransactionResponse } from '@solana/web3.js';
import bs58 from 'bs58';

export const ixDataToBuffer = (data: unknown): Buffer => {
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
};

export const getMessageAccountKeys = (tx: TransactionResponse): string[] => {
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
};

export const getMessageInstructions = (msg: Message) => {
  if (Array.isArray(msg.compiledInstructions)) return msg.compiledInstructions;
  if (Array.isArray(msg.instructions)) return msg.instructions;
  return [];
};

export const getRelevantInstructions = (
  tx: TransactionResponse,
  relevantIxDisc: Buffer[],
) => {
  const msg = tx.transaction.message;
  const ixs = getMessageInstructions(msg);

  return ixs.filter((ix) => {
    const data = ixDataToBuffer(ix.data);

    return relevantIxDisc.some((d) => d.equals(data.subarray(0, 8)));
  });
};
