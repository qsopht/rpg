import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { GuildsService } from './guilds.service';

class CreateGuildDto {
  @IsString() @Length(3, 24) name!: string;
  @IsString() @Length(2, 6) @Matches(/^[A-Z0-9]+$/) tag!: string;
  @IsOptional() @IsString() @Length(0, 280) description?: string;
}

class PromoteDto {
  @IsUUID() playerId!: string;
  @IsEnum(['officer', 'member'] as const) rank!: 'officer' | 'member';
}

@ApiTags('guilds')
@ApiBearerAuth()
@Controller('guilds')
@UseGuards(JwtAuthGuard)
export class GuildsController {
  constructor(private readonly guilds: GuildsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGuildDto) {
    return this.guilds.create(req.user.userId, dto.name, dto.tag, dto.description);
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.guilds.myGuild(req.user.userId);
  }

  @Get('rankings')
  rankings() {
    return this.guilds.rankings();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.guilds.get(id);
  }

  @Post(':id/join')
  join(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.guilds.join(req.user.userId, id);
  }

  @Post('leave')
  leave(@Req() req: AuthenticatedRequest) {
    return this.guilds.leave(req.user.userId);
  }

  @Post('promote')
  promote(@Req() req: AuthenticatedRequest, @Body() dto: PromoteDto) {
    return this.guilds.promote(req.user.userId, dto.playerId, dto.rank);
  }
}
