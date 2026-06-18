import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_TOKEN } from '../../database/database.module';

export interface MessageRow {
  id: string;
  channel: 'global' | 'guild' | 'dm';
  channel_id: string | null;
  sender_player_id: string;
  recipient_player_id: string | null;
  body: string;
  is_moderated: boolean;
  sent_at: Date;
}

@Injectable()
export class ChatRepository {
  constructor(@Inject(KNEX_TOKEN) private readonly db: Knex) {}

  async insert(row: Omit<MessageRow, 'id' | 'sent_at' | 'is_moderated'>) {
    const [r] = await this.db<MessageRow>('messages').insert(row).returning('*');
    return r;
  }

  history(channel: 'global' | 'guild' | 'dm', channelId: string | null, before: Date, limit = 50) {
    const q = this.db<MessageRow>('messages').where({ channel }).orderBy('sent_at', 'desc').limit(limit);
    if (channelId) q.andWhere({ channel_id: channelId });
    if (before) q.andWhere('sent_at', '<', before);
    return q;
  }

  dmThread(playerA: string, playerB: string, before: Date, limit = 50) {
    return this.db<MessageRow>('messages')
      .where({ channel: 'dm' })
      .andWhere((q) =>
        q
          .where({ sender_player_id: playerA, recipient_player_id: playerB })
          .orWhere({ sender_player_id: playerB, recipient_player_id: playerA }),
      )
      .andWhere('sent_at', '<', before)
      .orderBy('sent_at', 'desc')
      .limit(limit);
  }
}
