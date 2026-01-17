import { Injectable } from '@nestjs/common';
import { JupiterService } from '../jupiter/jupiter.service';
import { RedisService } from '../redis/redis.service';
import { AxiosError } from 'axios';

@Injectable()
export class PriceService {
  constructor(
    private jupiter: JupiterService,
    private redis: RedisService,
  ) {}

  public async getDailyPriceUsd(mint: string, day: string) {
    // USDC / USDT shortcut
    if (
      mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
      mint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    ) {
      return { price: 1, decimals: 6 };
    }

    const key = `price:${mint}:${day}`;
    try {
      const cache = await this.redis.client.get(key);

      if (cache) {
        return JSON.parse(cache) as { price: number; decimals: number };
      }

      const price = await this.jupiter.getPriceUsd(mint);

      if (!price) return null;

      await this.redis.client.set(key, JSON.stringify(price));

      return price;
    } catch (err) {
      if (err instanceof AxiosError) {
        throw Error(
          `Error during fetching price code": ${err.code} cause: ${err.message}`,
        );
      }
      throw err;
    }
  }
}
