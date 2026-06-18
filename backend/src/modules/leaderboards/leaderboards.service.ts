import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import Redis from 'ioredis';
import { REDIS_TOKEN } from '../../redis/redis.module';
import { KNEX_TOKEN } from '../../database/database.module';

export type Board = 'xp_total' | 'gold_total';

@Injectable()
export class LeaderboardsService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(KNEX_TOKEN) private readonly db: Knex,
  ) {}

  private key(board: Board) { return `lb:${board}`; }

  async addScore(board: Board, memberId: string, score: number) {
    await this.redis.zadd(this.key(board), score, memberId);
  }

  async addScoreIncr(board: Board, memberId: string, increment: number) {
    await this.redis.zincrby(this.key(board), increment, memberId);
  }

  async top(board: Board, limit = 50) {
    const raw = await this.redis.zrevrange(this.key(board), 0, limit - 1, 'WITHSCORES');
    const result: { rank: number; memberId: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ rank: i / 2 + 1, memberId: raw[i], score: Number(raw[i + 1]) });
    }
    // Hydrate display names. Members are character ids.
    const ids = result.map((r) => r.memberId);
    const rows = ids.length
      ? await this.db('characters')
          .leftJoin('players', 'players.id', 'characters.player_id')
          .whereIn('characters.id', ids)
          .select('characters.id as id', 'characters.name as character_name', 'players.display_name as player_name')
      : [];
    const byId = new Map(rows.map((r: any) => [r.id, r]));
    return result.map((r) => ({
      ...r,
      characterName: byId.get(r.memberId)?.character_name ?? '???',
      playerName: byId.get(r.memberId)?.player_name ?? '???',
    }));
  }

  async rank(board: Board, memberId: string): Promise<{ rank: number; score: number } | null> {
    const r = await this.redis.zrevrank(this.key(board), memberId);
    if (r === null) return null;
    const score = await this.redis.zscore(this.key(board), memberId);
    return { rank: r + 1, score: Number(score ?? 0) };
  }

  /** Snapshot top 100 into Postgres for history. */
  async snapshot(board: Board) {
    const top = await this.top(board, 100);
    // Stringify the array — pg would otherwise serialize it as a PG array literal.
    await this.db('leaderboards').insert({ board, snapshot: JSON.stringify(top) as any });
  }
}
