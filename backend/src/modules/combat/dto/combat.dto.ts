import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class StartEncounterDto {
  @IsUUID()
  characterId!: string;

  @IsString()
  regionId!: string;
}

export class CombatActionDto {
  @IsEnum(['attack', 'skill', 'defend', 'use_item', 'flee'] as const)
  action!: 'attack' | 'skill' | 'defend' | 'use_item' | 'flee';

  @IsOptional()
  @IsString()
  skillId?: 'power_strike' | 'arcane_bolt' | 'aimed_shot';

  @IsOptional()
  @IsString()
  itemId?: string;
}
