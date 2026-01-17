import { Injectable } from '@nestjs/common';
import { AggregatorConfigService } from '../config/config.service';
import axios from 'axios';

type Response = Record<
  string,
  {
    createdAt: string;
    liquidity: number;
    usdPrice: number;
    blockId: number;
    decimals: number;
    priceChange24h: number;
  }
>;

@Injectable()
export class JupiterService {
  constructor(private config: AggregatorConfigService) {}

  async getPriceUsd(
    mint: string,
  ): Promise<{ price: number; decimals: number } | null> {
    const { data } = await axios.get<Response>(`${this.config.jupiterUrl}`, {
      params: {
        ids: mint,
      },
      headers: {
        'x-api-key': this.config.jupiterApiKey,
      },
      timeout: 5_000,
    });

    const target = data[mint];

    if (!target) return null;

    return {
      price: target.usdPrice,
      decimals: target.decimals,
    };
  }
}
