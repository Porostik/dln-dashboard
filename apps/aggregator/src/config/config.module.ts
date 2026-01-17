import { Global, Module } from '@nestjs/common';
import { AggregatorConfigService } from './config.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AggregatorConfigService],
  exports: [AggregatorConfigService],
})
export class AggregatorConfigModule {}
