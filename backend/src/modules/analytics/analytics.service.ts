import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface TrackParams {
  name: string;
  properties?: Record<string, unknown>;
  userId?: string;
  characterId?: string;
  sessionId?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  track(p: TrackParams) {
    return this.db('events_analytics').insert({
      user_id: p.userId ?? null,
      character_id: p.characterId ?? null,
      name: p.name,
      properties: p.properties ?? {},
      session_id: p.sessionId ?? null,
    });
  }
}
