import { Module } from '@nestjs/common';
import { IndexerConfigService } from './config.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [IndexerConfigService],
  exports: [IndexerConfigService],
})
export class IndexerConfigModule {}
