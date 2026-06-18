import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { InventoryService } from './inventory.service';
import { CharactersRepository } from '../characters/characters.repository';
import { PlayersService } from '../players/players.service';
import { ForbiddenException } from '@nestjs/common';

class EquipDto {
  @IsString()
  inventoryItemId!: string;
}

class UnequipDto {
  @IsString()
  @Length(2, 32)
  slot!: string;
}

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('characters/:characterId/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly inv: InventoryService,
    private readonly characters: CharactersRepository,
    private readonly players: PlayersService,
  ) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Param('characterId', new ParseUUIDPipe()) characterId: string) {
    await this.assertOwner(req.user.userId, characterId);
    return this.inv.listByCharacter(characterId);
  }

  @Post('equip')
  async equip(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: EquipDto,
  ) {
    await this.assertOwner(req.user.userId, characterId);
    return this.inv.equip(characterId, dto.inventoryItemId);
  }

  @Post('unequip')
  async unequip(
    @Req() req: AuthenticatedRequest,
    @Param('characterId', new ParseUUIDPipe()) characterId: string,
    @Body() dto: UnequipDto,
  ) {
    await this.assertOwner(req.user.userId, characterId);
    return this.inv.unequip(characterId, dto.slot);
  }

  private async assertOwner(userId: string, characterId: string) {
    const c = await this.characters.findById(characterId);
    if (!c) throw new ForbiddenException({ code: 'character_not_found' });
    const me = await this.players.getByUserId(userId);
    if (c.player_id !== me.id) throw new ForbiddenException({ code: 'not_owner' });
  }
}
