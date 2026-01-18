import {
  AggregationJobsRepository,
  DayStatsRepository,
  EventType,
  OrderEventRepository,
  OrderEvents,
} from '@dln-dashboard/data-access';
import { AggregatorConfigService } from '../config/config.service';
import { Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { ProcessorService } from '../processor/processor.service';
import { RelevantInstructionsNotFound } from '../error';
import { Insertable } from 'kysely';
import Decimal from 'decimal.js';

type JobResult =
  | {
      sig: string;
      status: 'done';
      events: (Omit<Insertable<OrderEvents>, 'day'> & { day: Date })[];
    }
  | { sig: string; status: 'skipped'; events: [] }
  | { sig: string; status: 'failed'; error: unknown; events: [] };

export class WorkerService {
  private isRunning = false;
  private logger = new Logger(WorkerService.name);
  private idleMs;

  constructor(
    private id: string,
    private jobsRepo: AggregationJobsRepository,
    private config: AggregatorConfigService,
    private processor: ProcessorService,
    private orderEventsRepo: OrderEventRepository,
    private dayStatsRepo: DayStatsRepository,
  ) {
    this.idleMs = config.workerTickIntervalMs;
  }

  public async run() {
    this.isRunning = true;

    while (this.isRunning) {
      const didWork = await this.tick();
      if (didWork) {
        this.idleMs = this.config.workerTickIntervalMs;
        continue;
      }
      await new Promise((res) => setTimeout(res, this.idleMs));
      this.idleMs = Math.min(5000, Math.floor(this.idleMs * 1.5));
    }
  }

  public async stop() {
    this.isRunning = false;
  }

  private async tick() {
    const sigs = await this.jobsRepo.lockBatch({
      limit: this.config.workerJobsBatchSize,
      lockMs: this.config.workerJobsBatchLockMS,
      workerId: this.id,
      maxAttempts: 6,
    });

    if (!sigs.length) return false;

    const limiter = pLimit(this.config.workerJobsConcurrency);

    const results: JobResult[] = await Promise.all(
      sigs.map((sig) =>
        limiter(async (): Promise<JobResult> => {
          try {
            const events = await this.processor.process(sig);
            return { sig, status: 'done', events };
          } catch (err) {
            if (err instanceof RelevantInstructionsNotFound) {
              return { sig, status: 'skipped', events: [] };
            }
            return { sig, status: 'failed', error: err, events: [] };
          }
        }),
      ),
    );

    const done = results.filter(
      (r): r is Extract<JobResult, { status: 'done' }> => r.status === 'done',
    );
    const skipped = results.filter(
      (r): r is Extract<JobResult, { status: 'skipped' }> =>
        r.status === 'skipped',
    );
    const failed = results.filter(
      (r): r is Extract<JobResult, { status: 'failed' }> =>
        r.status === 'failed',
    );

    const flatEvents = done.flatMap((r) => r.events);

    try {
      await this.orderEventsRepo.insertMany(flatEvents);

      const deltas = this.splitByDayAndType(flatEvents);

      await Promise.all(
        deltas.map((d) =>
          this.dayStatsRepo.updateDayDelta(
            new Date(d.day),
            d.type,
            d.volume,
            d.count,
          ),
        ),
      );

      await Promise.all([
        this.jobsRepo.markDone(done.map((e) => e.sig)),
        this.jobsRepo.makeSkipped(skipped.map((e) => e.sig)),
        ...failed.map((r) =>
          this.jobsRepo.markFailed({
            signature: r.sig,
            error: r.error,
            baseDelayMs: this.config.workerJobsBaseErrorDelayMs,
            maxDelayMs: this.config.workerJobsMaxErrorDelayMs,
          }),
        ),
      ]);
    } catch (err) {
      this.logger.error({ err }, 'Error during update event stats');
      return false;
    }

    return true;
  }

  private splitByDayAndType(
    events: { day: Date; type: EventType; amount: string }[],
  ): {
    day: Date;
    type: EventType;
    count: number;
    volume: string;
  }[] {
    const acc = new Map<
      string,
      { day: Date; type: EventType; count: number; sum: Decimal }
    >();

    for (const e of events) {
      const key = `${e.day.toISOString().slice(0, 10)}:${e.type}`;

      const cur = acc.get(key) ?? {
        day: e.day,
        type: e.type,
        count: 0,
        sum: new Decimal(0),
      };
      cur.count += 1;

      cur.sum = cur.sum.plus(e.amount);

      acc.set(key, cur);
    }

    return [...acc.values()].map((x) => ({
      day: x.day,
      type: x.type,
      count: x.count,
      volume: x.sum.toString(),
    }));
  }
}
