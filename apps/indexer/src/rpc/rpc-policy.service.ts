import { Injectable, Logger } from '@nestjs/common';

type Methods = 'sig' | 'tx' | 'batchTx';

export type Policy = {
  baseDelay: number;
  maxDelay: number;
  maxAttempts: number;
  concurrency: Record<Methods, number>;
};

@Injectable()
export class RpcPolicyService {
  private logger = new Logger(RpcPolicyService.name);
  private inFlight: Record<Methods, number> = { sig: 0, tx: 0, batchTx: 0 };
  private readonly queue: Record<Methods, Array<() => void>> = {
    sig: [],
    tx: [],
    batchTx: [],
  };

  private nextAllowedAt: Record<Methods, number> = {
    sig: 0,
    tx: 0,
    batchTx: 0,
  };

  private minIntervalMs: Record<Methods, number> = {
    sig: 800,
    tx: 500,
    batchTx: 8000,
  };

  constructor(private readonly policy: Policy) {}

  public async run<T>(method: Methods, fn: () => Promise<T>) {
    let attempts = 0;
    let lastErr: unknown;

    while (attempts < this.policy.maxAttempts) {
      attempts += 1;
      try {
        return await this.runOnce(method, fn);
      } catch (err) {
        lastErr = err;

        if (!this.isRetryable(err) || attempts >= this.policy.maxAttempts) {
          this.logger.error({ err }, 'RPC call error after max retries');
          throw err;
        }

        const delay = this.getDelay(attempts);
        this.logger.warn(
          { err, attempts, delay, method },
          'RPC call error, retry',
        );
        await this.sleep(delay);
      }
    }

    this.logger.error({ err: lastErr }, 'RPC call error after max retries');
    throw lastErr;
  }

  private async acquire(method: Methods) {
    if (this.inFlight[method] < this.policy.concurrency[method]) {
      this.inFlight[method] += 1;
      return;
    }

    await new Promise((res) => {
      this.queue[method].push(() => {
        this.inFlight[method] += 1;
        res(void 0);
      });
    });
  }

  private release(method: Methods) {
    this.inFlight[method] -= 1;
    const next = this.queue[method].shift();
    if (next) next();
  }

  private async runOnce<T>(method: Methods, fn: () => Promise<T>) {
    await this.acquire(method);
    try {
      return await fn();
    } finally {
      this.release(method);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private jitter(ms: number, ratio = 0.2) {
    const delta = ms * ratio;
    return ms + (Math.random() * 2 - 1) * delta;
  }

  private getDelay(attempt: number) {
    const exp = this.policy.baseDelay * 2 ** (attempt - 1);
    const capped = Math.min(this.policy.maxDelay, exp);
    return this.jitter(capped);
  }

  private isRetryable(err: unknown) {
    const msg = String((err as any)?.message ?? '').toLowerCase();
    if (
      msg.includes('429') ||
      msg.includes('too many requests') ||
      msg.includes('ratelimit') ||
      msg.includes('rate limit')
    )
      return true;
    if (msg.includes('timeout') || msg.includes('timed out')) return true;
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('econnreset')
    )
      return true;
    if (msg.includes('502') || msg.includes('503') || msg.includes('504'))
      return true;
    return false;
  }

  private async throttle(method: Methods) {
    const now = Date.now();
    const wait = this.nextAllowedAt[method] - now;
    if (wait > 0) await this.sleep(wait);
    this.nextAllowedAt[method] = Date.now() + this.minIntervalMs[method];
  }
}
