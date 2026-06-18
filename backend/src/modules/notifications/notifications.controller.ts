import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from './notifications.service';
import { PlayersService } from '../players/players.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notif: NotificationsService, private readonly players: PlayersService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('unreadOnly') unreadOnly?: string) {
    const me = await this.players.getByUserId(req.user.userId);
    return this.notif.list(me.id, { unreadOnly: unreadOnly === 'true' });
  }

  @Post(':id/ack')
  async ack(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const me = await this.players.getByUserId(req.user.userId);
    return this.notif.ack(me.id, id);
  }
}
