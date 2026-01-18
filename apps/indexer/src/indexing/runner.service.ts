import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Scope,
} from '@nestjs/common';
import { SourceService } from './source.service';
import { DST_SOURCE, SRC_SOURCE } from './tokens';
import { IndexerMode } from '@dln-dashboard/data-access';

@Injectable({ scope: Scope.TRANSIENT })
export class Runner implements OnModuleDestroy {
  private isRunning = false;
  private mode: IndexerMode | null = null;
  private logger = new Logger(Runner.name);

  constructor(
    @Inject(SRC_SOURCE) private readonly srcSource: SourceService,
    @Inject(DST_SOURCE) private readonly dstSource: SourceService,
  ) {}

  async start(mode: IndexerMode) {
    await Promise.all([this.srcSource.init(mode), this.dstSource.init(mode)]);
    this.isRunning = true;
    this.mode = mode;
    this.run().catch((err) => {
      this.logger.error({ err }, 'Error start runner');
    });
  }

  onModuleDestroy() {
    this.isRunning = true;
  }

  private async run() {
    const sources = new Set([this.dstSource, this.srcSource]);

    while (this.isRunning) {
      let progressed = false;

      for (const source of sources) {
        try {
          const progress = await source.tick();

          if (!progress) continue;

          if (progress.status === 'processed') {
            this.logger.log(
              {
                newCursor: progress.newCursor,
                mode: this.mode,
                programId: progress.programId,
              },
              'Successful processed indexing page',
            );
            progressed = true;
            await new Promise((res) => setTimeout(res, 500));
          } else if (progress.status === 'exhausted') {
            this.logger.log(
              {
                lastProcessedCursor: progress.newCursor,
                programId: progress.programId,
              },
              'Exhausted indexing page',
            );
            if (await source.stop()) sources.delete(source);
          } else if (progress.status === 'empty') {
            this.logger.log(
              {
                lastProcessedCursor: progress.newCursor,
                programId: progress.programId,
                mode: this.mode,
              },
              'Empty indexing page',
            );
          }
        } catch (err) {
          this.logger.error(
            { err, mode: this.mode },
            'Indexer runner indexing page error',
          );
        }
      }

      if (!progressed) await new Promise((res) => setTimeout(res, 3000));
    }
  }
}
