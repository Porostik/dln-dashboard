import { DayStatsRepository } from '@dln-dashboard/data-access';
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  constructor(private dayStatsRepo: DayStatsRepository) {}

  private parseDate(date?: string) {
    if (date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`Invalid date: ${date}`);
      }
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
    }

    return undefined;
  }

  @Get('daily-volume')
  public async dailyVolume(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dayStatsRepo.getDayVolumes(
      this.parseDate(from),
      this.parseDate(to),
    );
  }
}
