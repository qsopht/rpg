import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface CombatLogRow {
  id: string;
  character_id: string;
  enemy_id: string;
  region_id: string;
  outcome: 'victory' | 'defeat' | 'fled';
  rounds: number;
  damage_dealt: number;
  damage_taken: number;
  xp_gained: number;
  gold_gained: number;
  loot: { item_id: string; quantity: number }[];
  started_at: Date;
  ended_at: Date;
}

@Injectable()
export class CombatRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  insertLog(row: Omit<CombatLogRow, 'id'>, trx?: Knex.Transaction) {
    // `loot` is an array → pg serializes arrays as PG array literals unless we
    // hand it a string for the JSONB column. Same gotcha as in seed.ts.
    return (trx ?? this.db)<CombatLogRow>('combat_logs')
      .insert({ ...row, loot: JSON.stringify(row.loot) as any })
      .returning('*');
  }

  recentByCharacter(characterId: string, limit = 20) {
    return this.db<CombatLogRow>('combat_logs')
      .where({ character_id: characterId })
      .orderBy('ended_at', 'desc')
      .limit(limit);
  }
}
