import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { AnalyticsService } from './analytics.service';

class TrackDto {
  @IsString() @Length(2, 64) name!: string;
  @IsOptional() @IsObject() properties?: Record<string, unknown>;
  @IsOptional() @IsString() characterId?: string;
  @IsOptional() @IsString() sessionId?: string;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('track')
  track(@Req() req: AuthenticatedRequest, @Body() dto: TrackDto) {
    return this.analytics.track({ ...dto, userId: req.user.userId });
  }
}
