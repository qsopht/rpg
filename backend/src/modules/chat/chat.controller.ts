import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ChatService } from './chat.service';
import { PlayersService } from '../players/players.service';

class SendDto {
  @IsEnum(['global', 'guild', 'dm'] as const)
  channel!: 'global' | 'guild' | 'dm';

  @IsOptional() @IsString() recipientDisplayName?: string;

  @IsString() @Length(1, 280) body!: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService, private readonly players: PlayersService) {}

  @Post('send')
  @Throttle({ default: { ttl: 10_000, limit: 5 } })
  send(@Req() req: AuthenticatedRequest, @Body() dto: SendDto) {
    return this.chat.send(req.user.userId, dto);
  }

  @Get('global')
  global(@Query('before') before?: string) {
    return this.chat.history('global', 'global', before);
  }

  @Get('guild/:guildId')
  guild(@Query('before') before?: string, @Query('guildId') guildId?: string) {
    return this.chat.history('guild', guildId ?? null, before);
  }

  @Get('dm/:otherDisplayName')
  async dm(
    @Req() req: AuthenticatedRequest,
    @Query('before') before?: string,
    @Query('otherDisplayName') name?: string,
  ) {
    const me = await this.players.getByUserId(req.user.userId);
    const other = await this.players.getPublicProfileByName(name ?? '');
    return this.chat.dmThread(me.id, other.id, before);
  }
}
