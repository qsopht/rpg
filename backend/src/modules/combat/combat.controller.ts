import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CombatService } from './combat.service';
import { CombatActionDto, StartEncounterDto } from './dto/combat.dto';

@ApiTags('combat')
@ApiBearerAuth()
@Controller('combat')
@UseGuards(JwtAuthGuard)
export class CombatController {
  constructor(private readonly combat: CombatService) {}

  @Post('start')
  start(@Req() req: AuthenticatedRequest, @Body() dto: StartEncounterDto) {
    return this.combat.start(req.user.userId, dto);
  }

  @Post(':encounterId/action')
  @Throttle({ default: { ttl: 1000, limit: 6 } })
  action(
    @Req() req: AuthenticatedRequest,
    @Param('encounterId', new ParseUUIDPipe()) encounterId: string,
    @Body() dto: CombatActionDto,
  ) {
    return this.combat.submitAction(req.user.userId, encounterId, dto);
  }

  @Get('logs/:characterId')
  logs(@Param('characterId', new ParseUUIDPipe()) characterId: string) {
    return this.combat.recentLogs(characterId);
  }
}
