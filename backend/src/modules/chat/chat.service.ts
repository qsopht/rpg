import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { REDIS_TOKEN } from '../../redis/redis.module';
import { ChatRepository } from './chat.repository';
import { GuildsRepository } from '../guilds/guilds.repository';
import { PlayersService } from '../players/players.service';

const MAX_BODY = 280;
const BLOCKED_WORDS = new Set(['fucker', 'shithead']); // placeholder — extend or replace

export type ChannelKind = 'global' | 'guild' | 'dm';

@Injectable()
export class ChatService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly repo: ChatRepository,
    private readonly guildsRepo: GuildsRepository,
    private readonly players: PlayersService,
    private readonly bus: EventEmitter2,
  ) {}

  async send(userId: string, params: {
    channel: ChannelKind;
    channelId?: string | null;
    recipientDisplayName?: string;
    body: string;
  }) {
    const me = await this.players.getByUserId(userId);
    const body = sanitize(params.body);
    if (!body.length) throw new BadRequestException({ code: 'empty_message' });
    if (body.length > MAX_BODY) throw new BadRequestException({ code: 'message_too_long' });

    let recipientId: string | null = null;
    let channelId: string | null = null;

    if (params.channel === 'guild') {
      const m = await this.guildsRepo.membership(me.id);
      if (!m) throw new ForbiddenException({ code: 'not_in_guild' });
      channelId = m.guild_id;
    } else if (params.channel === 'dm') {
      if (!params.recipientDisplayName) throw new BadRequestException({ code: 'recipient_required' });
      const r = await this.players.getPublicProfileByName(params.recipientDisplayName);
      recipientId = r.id;
      channelId = dmChannelId(me.id, r.id);
    } else if (params.channel === 'global') {
      channelId = 'global';
    }

    const message = await this.repo.insert({
      channel: params.channel,
      channel_id: channelId,
      sender_player_id: me.id,
      recipient_player_id: recipientId,
      body,
    });

    // Fan-out via Redis pub/sub. The chat gateway is subscribed.
    await this.redis.publish(
      `chat:${params.channel}:${channelId ?? 'global'}`,
      JSON.stringify({
        id: message.id,
        channel: message.channel,
        channelId: message.channel_id,
        from: { id: me.id, displayName: me.display_name },
        body: message.body,
        sentAt: message.sent_at,
      }),
    );

    this.bus.emit('chat.message_sent', { senderId: me.id, channel: params.channel, channelId });
    return message;
  }

  async history(channel: ChannelKind, channelId: string | null, before?: string) {
    const beforeDate = before ? new Date(before) : new Date();
    if (channel === 'global') return this.repo.history('global', 'global', beforeDate);
    if (channel === 'guild') return this.repo.history('guild', channelId, beforeDate);
    throw new BadRequestException({ code: 'use_dm_thread_for_dms' });
  }

  dmThread(myPlayerId: string, otherPlayerId: string, before?: string) {
    const beforeDate = before ? new Date(before) : new Date();
    return this.repo.dmThread(myPlayerId, otherPlayerId, beforeDate);
  }
}

function dmChannelId(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function sanitize(input: string): string {
  let s = input.trim().replace(/\s+/g, ' ');
  for (const w of BLOCKED_WORDS) {
    s = s.replace(new RegExp(w, 'gi'), '*'.repeat(w.length));
  }
  return s;
}
