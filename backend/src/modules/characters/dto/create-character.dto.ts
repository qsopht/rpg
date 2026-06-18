import { IsEnum, IsString, Length, Matches } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @Length(2, 24)
  @Matches(/^[A-Za-z][A-Za-z0-9_\-]*$/)
  name!: string;

  @IsEnum(['warrior', 'ranger', 'mage'] as const)
  class!: 'warrior' | 'ranger' | 'mage';
}
