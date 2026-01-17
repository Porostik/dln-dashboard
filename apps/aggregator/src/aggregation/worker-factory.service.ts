import {
  AggregationJobsRepository,
  DayStatsRepository,
  OrderEventRepository,
} from '@dln-dashboard/data-access';
import { Injectable } from '@nestjs/common';
import { AggregatorConfigService } from '../config/config.service';
import { WorkerService } from './worker.service';
import { ProcessorService } from '../processor/processor.service';

@Injectable()
export class WorkerFactoryService {
  constructor(
    private jobsRepo: AggregationJobsRepository,
    private config: AggregatorConfigService,
    private processor: ProcessorService,
    private orderEventsRepo: OrderEventRepository,
    private dayStatsRepo: DayStatsRepository,
  ) {}

  public create(id: string) {
    return new WorkerService(
      id,
      this.jobsRepo,
      this.config,
      this.processor,
      this.orderEventsRepo,
      this.dayStatsRepo,
    );
  }
}
