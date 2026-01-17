import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { AggregatorConfigModule } from '../config/config.module';
import { AggregatorConfigService } from '../config/config.service';
import { REDIS } from './token';

@Global()
@Module({
  imports: [AggregatorConfigModule],
  providers: [
    {
      inject: [AggregatorConfigService],
      provide: REDIS,
      useFactory: (config: AggregatorConfigService) => {
        const url = config.redisUrl;
        return new Redis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
