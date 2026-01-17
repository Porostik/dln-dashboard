import { createHash } from 'crypto';

export const anchorDisc = (name: string, prefix: string) => {
  return createHash('sha256')
    .update(`${prefix}:${name}`)
    .digest()
    .subarray(0, 8);
};

export const IX = {
  createOrder: anchorDisc('create_order', 'global'),
  createOrderWithNonce: anchorDisc('create_order_with_nonce', 'global'),
  fulfillOrder: anchorDisc('fulfill_order', 'global'),
};
