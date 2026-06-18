import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export type QuestKind = 'kill' | 'gather' | 'explore' | 'deliver';
export type QuestCadence = 'one_time' | 'daily' | 'weekly' | 'seasonal';
export type QuestStatus = 'accepted' | 'in_progress' | 'ready_to_turn_in' | 'completed' | 'abandoned';

export interface QuestRow {
  id: string;
  name: string;
  description: string;
  kind: QuestKind;
  cadence: QuestCadence;
  region_id: string | null;
  level_req: number;
  requirements: { target_type: string; target_id: string; count: number };
  rewards: { gold?: number; xp?: number; items?: { item_id: string; qty: number }[] };
  season_id: string | null;
  is_active: boolean;
}

export interface QuestProgressRow {
  id: string;
  character_id: string;
  quest_id: string;
  status: QuestStatus;
  progress: { count: number };
  accepted_at: Date;
  completed_at: Date | null;
  resets_at: Date | null;
}

@Injectable()
export class QuestsRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  // ---- catalog ----
  allQuests() {
    return this.db<QuestRow>('quests').where({ is_active: true });
  }
  questById(id: string) {
    return this.db<QuestRow>('quests').where({ id }).first();
  }

  // ---- progress ----
  listProgress(characterId: string) {
    return this.db<QuestProgressRow>('quest_progress')
      .where({ character_id: characterId })
      .whereIn('status', ['accepted', 'in_progress', 'ready_to_turn_in']);
  }

  findActive(characterId: string, questId: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<QuestProgressRow>('quest_progress')
      .where({ character_id: characterId, quest_id: questId })
      .whereIn('status', ['accepted', 'in_progress', 'ready_to_turn_in'])
      .first();
  }

  async insertProgress(row: Partial<QuestProgressRow>, trx?: Knex.Transaction) {
    const [r] = await (trx ?? this.db)<QuestProgressRow>('quest_progress').insert(row).returning('*');
    return r;
  }

  async updateProgress(id: string, patch: Partial<QuestProgressRow>, trx?: Knex.Transaction) {
    const [r] = await (trx ?? this.db)<QuestProgressRow>('quest_progress')
      .where({ id })
      .update(patch)
      .returning('*');
    return r as QuestProgressRow;
  }

  /** Active progress entries that match a kill / gather / explore target. */
  findMatchingProgress(
    characterId: string,
    targetType: 'enemy' | 'item' | 'region',
    targetId: string,
    trx?: Knex.Transaction,
  ) {
    const conn = trx ?? this.db;
    return conn<QuestProgressRow & { quest_id: string }>('quest_progress')
      .where({ character_id: characterId })
      .whereIn('status', ['accepted', 'in_progress'])
      .whereIn('quest_id', function () {
        this.from('quests')
          .where('is_active', true)
          .whereRaw(`requirements->>'target_type' = ?`, [targetType])
          .whereRaw(`requirements->>'target_id' = ?`, [targetId])
          .select('id');
      });
  }
}
