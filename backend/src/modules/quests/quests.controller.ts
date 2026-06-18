import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { QuestsService } from './quests.service';

class QuestIdDto {
  @IsString()
  questId!: string;
}

@ApiTags('quests')
@ApiBearerAuth()
@Controller('characters/:characterId/quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get('available')
  available(@Param('characterId', new ParseUUIDPipe()) cid: string) {
    return this.quests.listAvailable(cid);
  }

  @Get('active')
  active(@Param('characterId', new ParseUUIDPipe()) cid: string) {
    return this.quests.listActive(cid);
  }

  @Post('accept')
  accept(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', new ParseUUIDPipe()) cid: string,
    @Body() dto: QuestIdDto,
  ) {
    return this.quests.accept(req.user.userId, cid, dto.questId);
  }

  @Post('abandon')
  abandon(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', new ParseUUIDPipe()) cid: string,
    @Body() dto: QuestIdDto,
  ) {
    return this.quests.abandon(req.user.userId, cid, dto.questId);
  }

  @Post('turn-in')
  turnIn(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', new ParseUUIDPipe()) cid: string,
    @Body() dto: QuestIdDto,
  ) {
    return this.quests.turnIn(req.user.userId, cid, dto.questId);
  }
}
