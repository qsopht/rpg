import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsService } from './events.service';

@Injectable()
export class EventsListener {
  private readonly log = new Logger(EventsListener.name);
  constructor(private readonly events: EventsService) {}

  @OnEvent('combat.enemy_defeated')
  async onEnemyDefeated(p: { characterId: string; enemyId: string }) {
    try {
      await this.events.onEnemyDefeated(p.characterId, p.enemyId);
    } catch (e) {
      this.log.error('world events bump failed', e as Error);
    }
  }
}
