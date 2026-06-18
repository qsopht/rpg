import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

@Injectable()
export class NotificationsService {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  push(playerId: string, kind: string, payload: Record<string, unknown>, trx?: Knex.Transaction) {
    return (trx ?? this.db)('notifications').insert({ player_id: playerId, kind, payload });
  }

  list(playerId: string, opts?: { unreadOnly?: boolean }) {
    const q = this.db('notifications').where({ player_id: playerId }).orderBy('created_at', 'desc').limit(50);
    if (opts?.unreadOnly) q.andWhere({ read: false });
    return q;
  }

  ack(playerId: string, id: string) {
    return this.db('notifications').where({ player_id: playerId, id }).update({ read: true });
  }
}
