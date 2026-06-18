import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { ChatGateway } from './chat.gateway';
import { GuildsModule } from '../guilds/guilds.module';
import { PlayersModule } from '../players/players.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GuildsModule, PlayersModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
