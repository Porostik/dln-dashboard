import { Module } from '@nestjs/common';
import { ProcessorModule } from '../processor/processor.module';
import { AggregatorConfigModule } from '../config/config.module';
import { DataAccessModule } from '@dln-dashboard/data-access';
import { RunnerService } from './runner.service';
import { WorkerFactoryService } from './worker-factory.service';

@Module({
  imports: [ProcessorModule, AggregatorConfigModule, DataAccessModule],
  providers: [RunnerService, WorkerFactoryService],
})
export class AggregationModule {}
