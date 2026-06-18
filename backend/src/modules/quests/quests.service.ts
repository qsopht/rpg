import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';
import { QuestsRepository, QuestProgressRow, QuestRow } from './quests.repository';
import { CharactersService } from '../characters/characters.service';
import { CharactersRepository } from '../characters/characters.repository';
import { InventoryService } from '../inventory/inventory.service';
import { PlayersRepository } from '../players/players.repository';

@Injectable()
export class QuestsService {
  constructor(
    @Inject(KNEX_TOKEN) private readonly db: Knex,
    private readonly repo: QuestsRepository,
    private readonly characters: CharactersService,
    private readonly charsRepo: CharactersRepository,
    private readonly inventory: InventoryService,
    private readonly playersRepo: PlayersRepository,
    private readonly bus: EventEmitter2,
  ) {}

  async listAvailable(characterId: string): Promise<QuestRow[]> {
    const c = await this.charsRepo.findById(characterId);
    if (!c) throw new NotFoundException({ code: 'character_not_found' });
    const all = await this.repo.allQuests();
    const active = await this.repo.listProgress(characterId);
    const activeIds = new Set(active.map((a) => a.quest_id));
    return all.filter((q) => !activeIds.has(q.id) && q.level_req <= c.level);
  }

  listActive(characterId: string) {
    return this.repo.listProgress(characterId);
  }

  async accept(userId: string, characterId: string, questId: string): Promise<QuestProgressRow> {
    const c = await this.characters.get(userId, characterId);
    const quest = await this.repo.questById(questId);
    if (!quest || !quest.is_active) throw new NotFoundException({ code: 'quest_not_found' });
    if (c.level < quest.level_req) {
      throw new BadRequestException({ code: 'level_too_low', required: quest.level_req });
    }
    const existing = await this.repo.findActive(characterId, questId);
    if (existing) throw new ConflictException({ code: 'quest_already_active' });

    const resetsAt = computeResetTime(quest.cadence);
    return this.repo.insertProgress({
      character_id: characterId,
      quest_id: questId,
      status: 'accepted',
      progress: { count: 0 },
      resets_at: resetsAt,
    });
  }

  async abandon(userId: string, characterId: string, questId: string) {
    await this.characters.get(userId, characterId);
    const p = await this.repo.findActive(characterId, questId);
    if (!p) throw new NotFoundException({ code: 'no_active_quest' });
    return this.repo.updateProgress(p.id, { status: 'abandoned' });
  }

  /**
   * Increment progress for any active quests matching the (targetType,targetId).
   * Called by the event listener when combat/inventory/region events fire.
   */
  async bumpProgress(
    characterId: string,
    targetType: 'enemy' | 'item' | 'region',
    targetId: string,
    amount: number,
    trx?: Knex.Transaction,
  ) {
    const run = async (tx: Knex.Transaction) => {
      const candidates = await this.repo.findMatchingProgress(characterId, targetType, targetId, tx);
      if (candidates.length === 0) return [] as QuestProgressRow[];

      const updated: QuestProgressRow[] = [];
      for (const p of candidates) {
        const quest = await this.repo.questById(p.quest_id);
        if (!quest) continue;

        let nextCount = p.progress.count + amount;
        if (targetType === 'item') {
          // For gather quests use actual carried count, not the delta.
          nextCount = await this.inventory.countItem(characterId, targetId);
        }
        const required = quest.requirements.count;
        nextCount = Math.min(nextCount, required);

        const status = nextCount >= required ? 'ready_to_turn_in' : 'in_progress';
        const r = await this.repo.updateProgress(p.id, {
          progress: { count: nextCount },
          status,
        }, tx);
        updated.push(r);

        if (status === 'ready_to_turn_in') {
          this.bus.emit('quest.ready_to_turn_in', { characterId, questId: quest.id });
        }
      }
      return updated;
    };
    return trx ? run(trx) : this.db.transaction(run);
  }

  /** Player-triggered turn-in. Pays rewards. */
  async turnIn(userId: string, characterId: string, questId: string) {
    const c = await this.characters.get(userId, characterId);
    return this.db.transaction(async (tx) => {
      const p = await tx<QuestProgressRow>('quest_progress')
        .where({ character_id: characterId, quest_id: questId })
        .whereIn('status', ['ready_to_turn_in'])
        .forUpdate()
        .first();
      if (!p) throw new BadRequestException({ code: 'not_ready_to_turn_in' });

      const quest = await this.repo.questById(questId);
      if (!quest) throw new NotFoundException({ code: 'quest_not_found' });

      const rewards = quest.rewards ?? {};
      const player = await tx('players').where({ id: c.player_id }).forUpdate().first();
      if (!player) throw new NotFoundException({ code: 'player_not_found' });

      if (rewards.gold) {
        await this.playersRepo.adjustGold(c.player_id, rewards.gold, tx);
      }
      if (rewards.items?.length) {
        await this.inventory.grant(
          characterId,
          rewards.items.map((it) => ({ itemId: it.item_id, quantity: it.qty })),
          tx,
        );
      }
      if (rewards.xp) {
        await this.characters.addXp(characterId, rewards.xp, tx);
      }

      await this.repo.updateProgress(p.id, {
        status: 'completed',
        completed_at: new Date(),
      }, tx);

      this.bus.emit('quest.completed', { characterId, questId });
      return { rewards };
    });
  }
}

function computeResetTime(cadence: 'one_time' | 'daily' | 'weekly' | 'seasonal'): Date | null {
  const now = new Date();
  if (cadence === 'daily') {
    const d = new Date(now);
    d.setUTCHours(24, 0, 0, 0); // next UTC midnight
    return d;
  }
  if (cadence === 'weekly') {
    const d = new Date(now);
    const day = d.getUTCDay();
    const daysUntilMonday = (8 - day) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysUntilMonday);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  return null;
}
