import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly notif: NotificationsService,
  ) {}

  @OnEvent('character.level_up')
  async onLevelUp(p: { characterId: string; newLevel: number }) {
    const c = await this.db('characters').where({ id: p.characterId }).first();
    if (!c) return;
    await this.notif.push(c.player_id, 'level_up', { characterId: p.characterId, newLevel: p.newLevel });
  }

  @OnEvent('quest.ready_to_turn_in')
  async onQuestReady(p: { characterId: string; questId: string }) {
    const c = await this.db('characters').where({ id: p.characterId }).first();
    if (!c) return;
    await this.notif.push(c.player_id, 'quest_ready', p);
  }
}
