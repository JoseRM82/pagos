import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { SESSION_COOKIE } from './auth.service';

function cookieExtractor(req: Request): string | null {
  const token = req.cookies?.[SESSION_COOKIE];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  validate(payload: { sub?: string; name?: string }) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return { email: payload.sub, name: payload.name ?? payload.sub };
  }
}
