import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';
import { REDIS } from './token';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS) private redis: RedisClient) {}

  async onModuleDestroy() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }

  get client() {
    return this.redis;
  }
}
