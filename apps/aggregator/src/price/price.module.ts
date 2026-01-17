import { Module } from '@nestjs/common';
import { JupiterModule } from '../jupiter/jupiter.module';
import { RedisModule } from '../redis/redis.module';
import { PriceService } from './price.service';

@Module({
  imports: [JupiterModule, RedisModule],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
