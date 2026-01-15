import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { SourceService } from './source.service';
import { PipelineStateRepository } from '@dln-dashboard/data-access';
import { DST_SOURCE, SRC_SOURCE } from './tokens';

export class Runner implements OnModuleDestroy {
  private isRunning = false;
  private logger = new Logger(Runner.name);

  constructor(
    @Inject(SRC_SOURCE) private readonly srcSource: SourceService,
    @Inject(DST_SOURCE) private readonly dstSource: SourceService,
    private pipelineRepository: PipelineStateRepository,
  ) {}

  async start() {
    await Promise.all([this.srcSource.init(), this.dstSource.init()]);
    this.isRunning = true;
    this.run().catch((err) => {
      this.logger.error({ err }, 'Error start runner');
    });
  }

  onModuleDestroy() {
    this.isRunning = false;
  }

  private async run() {
    const sources = new Set([this.srcSource, this.dstSource]);

    while (this.isRunning) {
      const isBackfillDone = await this.pipelineRepository.geBackfillDone();

      let progressed = false;

      for (const source of sources) {
        try {
          if (!isBackfillDone) {
            const progress = await source.tickBackfill();

            if (progress.status === 'processed') {
              this.logger.log(
                { newCursor: progress.newCursor },
                'Successful processed indexing page',
              );
              progressed = true;
              await new Promise((res) => setTimeout(res, 500));
            } else if (progress.status === 'exhausted') {
              this.logger.log(
                { lastProcessedCursor: progress.newCursor },
                'Exhausted indexing page',
              );
            }
          } else {
            const progress = await source.tickForward();

            if (progress.status === 'processed') {
              this.logger.log(
                { newCursor: progress.newCursor },
                'Successful processed indexing page',
              );
              progressed = true;
              await new Promise((res) => setTimeout(res, 500));
            }
          }
        } catch (err) {
          this.logger.error({ err }, 'Indexer runner indexing page error');
        }
      }

      if (!progressed) await new Promise((res) => setTimeout(res, 5000));
    }
  }
}
