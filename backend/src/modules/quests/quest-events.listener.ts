import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QuestsService } from './quests.service';

@Injectable()
export class QuestEventsListener {
  private readonly log = new Logger(QuestEventsListener.name);

  constructor(private readonly quests: QuestsService) {}

  @OnEvent('combat.enemy_defeated')
  async onEnemyDefeated(p: { characterId: string; enemyId: string; count?: number }) {
    try {
      await this.quests.bumpProgress(p.characterId, 'enemy', p.enemyId, p.count ?? 1);
    } catch (e) {
      this.log.error('quest bump (kill) failed', e as Error);
    }
  }

  @OnEvent('inventory.granted')
  async onItemGranted(p: { characterId: string; grants: { itemId: string; quantity: number }[] }) {
    try {
      // bumpProgress recomputes from inventory.countItem for 'item' targets, so amount is informational
      for (const g of p.grants) {
        await this.quests.bumpProgress(p.characterId, 'item', g.itemId, g.quantity);
      }
    } catch (e) {
      this.log.error('quest bump (gather) failed', e as Error);
    }
  }

  @OnEvent('character.entered_region')
  async onEnteredRegion(p: { characterId: string; regionId: string }) {
    try {
      await this.quests.bumpProgress(p.characterId, 'region', p.regionId, 1);
    } catch (e) {
      this.log.error('quest bump (explore) failed', e as Error);
    }
  }
}
