import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export type CharacterClass = 'warrior' | 'ranger' | 'mage';

export interface Stats {
  health: number;
  attack: number;
  defense: number;
  agility: number;
  magic: number;
}

export interface CharacterRow {
  id: string;
  player_id: string;
  name: string;
  class: CharacterClass;
  level: number;
  xp: string; // bigint comes back as string from pg
  skill_points: number;
  stats: Stats;
  equipment: Record<string, string>; // slot -> inventory_item_id
  current_region_id: string | null;
  created_at: Date;
}

@Injectable()
export class CharactersRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  findById(id: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)<CharacterRow>('characters').where({ id }).first();
  }

  listByPlayer(playerId: string) {
    return this.db<CharacterRow>('characters').where({ player_id: playerId }).orderBy('created_at');
  }

  async create(row: Omit<CharacterRow, 'id' | 'level' | 'xp' | 'skill_points' | 'created_at'>) {
    const [r] = await this.db<CharacterRow>('characters').insert(row).returning('*');
    return r;
  }

  async update(id: string, patch: Partial<CharacterRow>, trx?: Knex.Transaction) {
    const conn = trx ?? this.db;
    const [r] = await conn('characters')
      .where({ id })
      .update({ ...patch, updated_at: this.db.fn.now() })
      .returning('*');
    return r as CharacterRow;
  }

  async addXp(id: string, amount: number, trx?: Knex.Transaction): Promise<CharacterRow> {
    const conn = trx ?? this.db;
    const [r] = await conn('characters')
      .where({ id })
      .update({
        xp: conn.raw('xp + ?', [amount]),
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return r as CharacterRow;
  }

  /** Locks the row for the duration of the transaction. */
  selectForUpdate(id: string, trx: Knex.Transaction) {
    return trx<CharacterRow>('characters').where({ id }).forUpdate().first();
  }
}
