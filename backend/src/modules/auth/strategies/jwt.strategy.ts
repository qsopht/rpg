import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthPrincipal } from '../../../common/types/authenticated-request';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is required');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub?: string; email?: string; role?: 'player' | 'admin' }): Promise<AuthPrincipal> {
    if (!payload.sub || !payload.email) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email, role: payload.role ?? 'player' };
  }
}
