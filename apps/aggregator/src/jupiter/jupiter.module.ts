import { Module } from '@nestjs/common';
import { AggregatorConfigModule } from '../config/config.module';
import { JupiterService } from './jupiter.service';

@Module({
  imports: [AggregatorConfigModule],
  providers: [JupiterService],
  exports: [JupiterService],
})
export class JupiterModule {}
