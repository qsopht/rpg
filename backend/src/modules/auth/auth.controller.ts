import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
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
  @ApiOperation({ summary: 'Google Sign-In with an id_token already obtained client-side.' })
  google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.auth.loginWithGoogle(dto.idToken, sessionMeta(req));
  }

  @Get('google/start')
  @ApiOperation({
    summary: 'Server-mediated Google OAuth — kick off the flow.',
    description:
      'Mobile client opens this URL in the system browser with ?redirectUri=aetheria://oauth-callback. ' +
      'Backend redirects to Google, handles the consent + code exchange, then redirects back to the deep link with JWT tokens.',
  })
  async googleStart(
    @Query('redirectUri') redirectUri: string,
    @Res() res: Response,
  ) {
    if (!redirectUri) {
      throw new BadRequestException({ code: 'redirect_uri_required' });
    }
    const url = await this.auth.startGoogleOAuth(redirectUri);
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback. Not invoked by clients directly — Google calls this.' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error) {
      return res
        .status(401)
        .type('text/html')
        .send(renderError(`Google auth failed: ${escapeHtml(error)}`));
    }
    if (!code || !state) {
      return res
        .status(400)
        .type('text/html')
        .send(renderError('Missing code or state'));
    }
    try {
      const result = await this.auth.finishGoogleOAuth(code, state, sessionMeta(req));
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.user.id,
        displayName: result.user.displayName,
      });
      // 302 to the mobile deep link — the OS catches the scheme and hands it to the app.
      return res.redirect(`${result.redirectUri}?${params.toString()}`);
    } catch (e: any) {
      const msg = e?.response?.code ?? e?.message ?? 'unknown';
      return res
        .status(401)
        .type('text/html')
        .send(renderError(`Sign-in failed: ${escapeHtml(msg)}`));
    }
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

function renderError(message: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Sign-in error</title>
<style>body{font-family:system-ui;padding:32px;max-width:480px;margin:auto;color:#333}</style>
<h1>Couldn't sign you in</h1>
<p>${message}</p>
<p>Return to the app and try again.</p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
