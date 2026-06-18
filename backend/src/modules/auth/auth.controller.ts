import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Email/password registration. Creates a player profile.' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, sessionMeta(req));
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email/password login.' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, sessionMeta(req));
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Google Sign-In (id_token).' })
  google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.auth.loginWithGoogle(dto.idToken, sessionMeta(req));
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access+refresh pair.' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, sessionMeta(req));
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user.' })
  logout(@Req() req: AuthenticatedRequest) {
    return this.auth.logout(req.user.userId);
  }
}

function sessionMeta(req: Request) {
  return {
    userAgent: (req.headers['user-agent'] as string)?.slice(0, 250) ?? null,
    ip: (req.ip ?? '').slice(0, 60) || null,
  };
}
