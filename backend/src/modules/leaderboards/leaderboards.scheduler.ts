import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardsService } from './leaderboards.service';

@Injectable()
export class LeaderboardsScheduler {
  private readonly log = new Logger(LeaderboardsScheduler.name);
  constructor(private readonly lb: LeaderboardsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async snapshot() {
    try {
      await this.lb.snapshot('xp_total');
    } catch (e) {
      this.log.error('snapshot failed', e as Error);
    }
  }
}
