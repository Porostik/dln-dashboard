import { Module } from '@nestjs/common';
import { DataAccessModule, db } from '@dln-dashboard/data-access';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [DataAccessModule.forRoot(db)],
  controllers: [DashboardController],
})
export class DashboardModule {}
