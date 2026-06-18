import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface WorldEventRow {
  id: string;
  template_id: string;
  name: string;
  description: string;
  status: 'scheduled' | 'active' | 'ended';
  progress: string; // bigint
  progress_goal: string;
  region_id: string | null;
  rewards: any;
  starts_at: Date;
  ends_at: Date;
}

export interface ParticipantRow {
  id: string;
  event_id: string;
  character_id: string;
  contribution: number;
  rewarded: boolean;
  updated_at: Date;
}

@Injectable()
export class EventsRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  active() {
    return this.db<WorldEventRow>('world_events')
      .where({ status: 'active' })
      .andWhere('ends_at', '>', this.db.fn.now());
  }
  byId(id: string) { return this.db<WorldEventRow>('world_events').where({ id }).first(); }

  insert(row: Partial<WorldEventRow>) {
    return this.db<WorldEventRow>('world_events').insert(row).returning('*');
  }

  setStatus(id: string, status: 'scheduled' | 'active' | 'ended') {
    return this.db('world_events').where({ id }).update({ status });
  }

  async incrementProgress(eventId: string, by: number, trx?: Knex.Transaction) {
    const conn = trx ?? this.db;
    const [r] = await conn('world_events')
      .where({ id: eventId })
      .update({ progress: conn.raw('progress + ?', [by]) })
      .returning('*');
    return r as WorldEventRow;
  }

  async upsertParticipant(eventId: string, characterId: string, delta: number, trx?: Knex.Transaction) {
    const conn = trx ?? this.db;
    return conn.raw(
      `INSERT INTO world_event_participants (event_id, character_id, contribution, rewarded)
       VALUES (?, ?, ?, false)
       ON CONFLICT (event_id, character_id)
       DO UPDATE SET contribution = world_event_participants.contribution + EXCLUDED.contribution,
                     updated_at = now()`,
      [eventId, characterId, delta],
    );
  }

  participantsToReward(eventId: string) {
    return this.db<ParticipantRow>('world_event_participants').where({ event_id: eventId, rewarded: false });
  }

  markRewarded(participantId: string, trx?: Knex.Transaction) {
    return (trx ?? this.db)('world_event_participants').where({ id: participantId }).update({ rewarded: true });
  }

  expiredActive() {
    return this.db<WorldEventRow>('world_events')
      .where({ status: 'active' })
      .andWhere('ends_at', '<=', this.db.fn.now());
  }
}
