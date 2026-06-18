import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { xpForLevel } from './leveling';

class EnterRegionDto {
  @IsString()
  @Length(2, 64)
  regionId!: string;
}

@ApiTags('characters')
@ApiBearerAuth()
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const list = await this.characters.list(req.user.userId);
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      class: c.class,
      level: c.level,
      xp: Number(c.xp),
      xpToNext: xpForLevel(c.level + 1) - Number(c.xp),
      stats: c.stats,
      equipment: c.equipment,
      currentRegionId: c.current_region_id,
    }));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCharacterDto) {
    return this.characters.create(req.user.userId, dto);
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    const c = await this.characters.get(req.user.userId, id);
    return {
      id: c.id,
      name: c.name,
      class: c.class,
      level: c.level,
      xp: Number(c.xp),
      xpToNext: xpForLevel(c.level + 1) - Number(c.xp),
      skillPoints: c.skill_points,
      stats: c.stats,
      equipment: c.equipment,
      currentRegionId: c.current_region_id,
    };
  }

  @Put(':id/region')
  enterRegion(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EnterRegionDto,
  ) {
    return this.characters.setRegion(req.user.userId, id, dto.regionId);
  }
}
