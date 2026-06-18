import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface PlayerRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_id: string | null;
  bio: string | null;
  gold: number;
  gems: number;
  last_seen_at: Date;
  created_at: Date;
}

@Injectable()
export class PlayersRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  findById(id: string) {
    return this.db<PlayerRow>('players').where({ id }).first();
  }

  findByUserId(userId: string) {
    return this.db<PlayerRow>('players').where({ user_id: userId }).first();
  }

  findByDisplayName(name: string) {
    return this.db<PlayerRow>('players').where({ display_name: name }).first();
  }

  async update(id: string, patch: Partial<Pick<PlayerRow, 'avatar_id' | 'bio'>>) {
    const [r] = await this.db('players')
      .where({ id })
      .update({ ...patch, updated_at: this.db.fn.now() })
      .returning('*');
    return r;
  }

  /** Adjust gold by a signed delta. Throws if it would go negative. */
  async adjustGold(playerId: string, delta: number, trx?: Knex.Transaction): Promise<number> {
    const conn = trx ?? this.db;
    const row = await conn('players')
      .where({ id: playerId })
      .forUpdate()
      .first('gold');
    if (!row) throw new Error('player_not_found');
    const next = row.gold + delta;
    if (next < 0) throw new Error('insufficient_gold');
    await conn('players').where({ id: playerId }).update({ gold: next, updated_at: this.db.fn.now() });
    return next;
  }

  touch(id: string) {
    return this.db('players').where({ id }).update({ last_seen_at: this.db.fn.now() });
  }
}
