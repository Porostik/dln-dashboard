import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AggregatorConfigService {
  public workersCount: number;
  public workerTickIntervalMs: number;
  public workerJobsBatchSize: number;
  public workerJobsBatchLockMS: number;
  public workerJobsConcurrency: number;
  public workerJobsBaseErrorDelayMs: number;
  public workerJobsMaxErrorDelayMs: number;
  public srcProgramId: string;
  public dstProgramId: string;
  public jupiterUrl: string;
  public jupiterApiKey: string;
  public redisUrl: string;
  public rpcUrl: string;

  constructor(configService: ConfigService) {
    this.workersCount = Number(
      configService.getOrThrow<string>('AGGREGATION_WORKERS_COUNT'),
    );
    this.workerTickIntervalMs = Number(
      configService.getOrThrow<string>('AGGREGATION_WORKER_TICK_INTERVAL_MS'),
    );
    this.workerJobsBatchSize = Number(
      configService.getOrThrow<string>('AGGREGATION_WORKER_JOBS_BATCH_SIZE'),
    );
    this.workerJobsBatchLockMS = Number(
      configService.getOrThrow<string>('AGGREGATION_WORKER_JOBS_BATCH_LOCK_MS'),
    );
    this.workerJobsConcurrency = Number(
      configService.getOrThrow<string>('AGGREGATION_WORKER_JOBS_CONCURRENCY'),
    );
    this.workerJobsBaseErrorDelayMs = Number(
      configService.getOrThrow<string>(
        'AGGREGATION_WORKER_JOBS_BASE_ERROR_DELAY_MS',
      ),
    );
    this.workerJobsMaxErrorDelayMs = Number(
      configService.getOrThrow<string>(
        'AGGREGATION_WORKER_JOBS_MAX_ERROR_DELAY_MS',
      ),
    );
    this.srcProgramId = configService.getOrThrow<string>('SRC_PROGRAM_ID');
    this.dstProgramId = configService.getOrThrow<string>('DST_PROGRAM_ID');
    this.jupiterUrl = configService.getOrThrow<string>('JUPITER_URL');
    this.jupiterApiKey = configService.getOrThrow<string>('JUPITER_API_KEY');
    this.redisUrl = configService.getOrThrow<string>('REDIS_URL');
    this.rpcUrl = configService.getOrThrow<string>('SOLANA_RPC_URL');
  }
}
