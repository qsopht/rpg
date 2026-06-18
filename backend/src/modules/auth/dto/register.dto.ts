import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsString()
  @Length(3, 24)
  @Matches(/^[A-Za-z0-9_\-]+$/)
  displayName!: string;
}
