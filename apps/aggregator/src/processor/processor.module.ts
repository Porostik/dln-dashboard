import { Module } from '@nestjs/common';
import { ParserModule } from '../parser/parser.module';
import { PriceModule } from '../price/price.module';
import { ProcessorService } from './processor.service';

@Module({
  imports: [ParserModule, PriceModule],
  providers: [ProcessorService],
  exports: [ProcessorService],
})
export class ProcessorModule {}
