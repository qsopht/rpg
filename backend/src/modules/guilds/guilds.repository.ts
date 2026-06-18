import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface GuildRow {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  owner_player_id: string;
  level: number;
  member_cap: number;
  created_at: Date;
}

export interface GuildMemberRow {
  id: string;
  guild_id: string;
  player_id: string;
  rank: 'leader' | 'officer' | 'member';
  joined_at: Date;
}

@Injectable()
export class GuildsRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  byId(id: string) { return this.db<GuildRow>('guilds').where({ id }).first(); }
  byName(name: string) { return this.db<GuildRow>('guilds').where({ name }).first(); }
  byTag(tag: string) { return this.db<GuildRow>('guilds').where({ tag }).first(); }

  async createGuild(row: Omit<GuildRow, 'id' | 'level' | 'member_cap' | 'created_at'>, trx?: Knex.Transaction) {
    const [r] = await (trx ?? this.db)<GuildRow>('guilds').insert(row).returning('*');
    return r;
  }

  async addMember(row: Omit<GuildMemberRow, 'id' | 'joined_at'>, trx?: Knex.Transaction) {
    const [r] = await (trx ?? this.db)<GuildMemberRow>('guild_members').insert(row).returning('*');
    return r;
  }

  membership(playerId: string) {
    return this.db<GuildMemberRow>('guild_members').where({ player_id: playerId }).first();
  }

  members(guildId: string) {
    return this.db('guild_members')
      .leftJoin('players', 'players.id', 'guild_members.player_id')
      .where({ guild_id: guildId })
      .select(
        'guild_members.id as id',
        'guild_members.rank as rank',
        'players.id as player_id',
        'players.display_name as display_name',
        'guild_members.joined_at as joined_at',
      )
      .orderBy([{ column: 'rank', order: 'asc' }, { column: 'joined_at', order: 'asc' }]);
  }

  countMembers(guildId: string) {
    return this.db('guild_members').where({ guild_id: guildId }).count<{ count: string }[]>('* as count').first();
  }

  removeMember(guildId: string, playerId: string) {
    return this.db('guild_members').where({ guild_id: guildId, player_id: playerId }).delete();
  }

  setRank(guildId: string, playerId: string, rank: 'leader' | 'officer' | 'member') {
    return this.db('guild_members').where({ guild_id: guildId, player_id: playerId }).update({ rank });
  }

  topByLevel(limit = 50) {
    return this.db<GuildRow>('guilds').orderBy('level', 'desc').limit(limit);
  }
}
