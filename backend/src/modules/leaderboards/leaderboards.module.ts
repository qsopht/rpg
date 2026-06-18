import { Module } from '@nestjs/common';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardsScheduler } from './leaderboards.scheduler';
import { LeaderboardsListener } from './leaderboards.listener';

@Module({
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService, LeaderboardsScheduler, LeaderboardsListener],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}
