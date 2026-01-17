import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WorkerService } from './worker.service';
import { AggregatorConfigService } from '../config/config.service';
import { WorkerFactoryService } from './worker-factory.service';

@Injectable()
export class RunnerService implements OnModuleInit, OnModuleDestroy {
  private workers: WorkerService[] = [];
  private logger = new Logger(RunnerService.name);

  constructor(
    private config: AggregatorConfigService,
    private workersFactory: WorkerFactoryService,
  ) {}

  onModuleInit() {
    for (let idx = 0; idx < this.config.workersCount; idx++) {
      const w = this.workersFactory.create(`agg-worker-${process.pid}-${idx}`);
      this.workers.push(w);
    }
    this.logger.log(`Started ${this.config.workersCount} workers`);
  }

  onModuleDestroy() {
    this.workers.forEach((w) => w.stop());
  }

  public start() {
    this.workers.forEach((w) => w.run());
  }
}
