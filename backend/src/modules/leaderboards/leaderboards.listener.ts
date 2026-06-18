import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeaderboardsService } from './leaderboards.service';

@Injectable()
export class LeaderboardsListener {
  constructor(private readonly lb: LeaderboardsService) {}

  @OnEvent('character.xp_gained')
  async onXp(p: { characterId: string; totalXp: number }) {
    await this.lb.addScore('xp_total', p.characterId, p.totalXp);
  }
}
