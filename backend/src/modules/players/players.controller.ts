import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayersService } from './players.service';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 32)
  avatarId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 280)
  bio?: string;
}

@ApiTags('players')
@ApiBearerAuth()
@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    const p = await this.players.getByUserId(req.user.userId);
    return {
      id: p.id,
      displayName: p.display_name,
      avatarId: p.avatar_id,
      bio: p.bio,
      gold: p.gold,
      gems: p.gems,
      lastSeenAt: p.last_seen_at,
    };
  }

  @Patch('me')
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.players.updateProfile(req.user.userId, dto);
  }

  @Get(':displayName')
  publicProfile(@Param('displayName') displayName: string) {
    return this.players.getPublicProfileByName(displayName);
  }
}
