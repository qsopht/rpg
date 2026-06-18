import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { REDIS_TOKEN } from '../../redis/redis.module';

@WebSocketGateway({ namespace: '/ws/chat', cors: { origin: true } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger(ChatGateway.name);
  private sub!: Redis;

  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  async afterInit() {
    // Dedicated subscriber connection — ioredis subscriptions claim the connection.
    this.sub = this.redis.duplicate();
    await this.sub.psubscribe('chat:*');
    this.sub.on('pmessage', (_pattern, channel, message) => {
      // channel = chat:<kind>:<channelId>
      this.server.to(channel).emit('chat:message', JSON.parse(message));
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token ?? '').toString();
      if (!token) throw new Error('missing token');
      const payload = await this.jwt.verifyAsync(token);
      (client.data as any).userId = payload.sub;

      const guildId = client.handshake.query.guildId as string | undefined;
      client.join('chat:global:global');
      if (guildId) client.join(`chat:guild:${guildId}`);
      client.join(`chat:dm:user:${payload.sub}`);
    } catch (e) {
      this.log.warn(`auth failed: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {}
}
