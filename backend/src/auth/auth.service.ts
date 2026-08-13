import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const SESSION_COOKIE = 'pagos_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUser = {
  email: string;
  name: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  assertAllowedEmail(email: string | undefined): string {
    const allowed = (process.env.AUTH_ALLOWED_EMAIL ?? '')
      .trim()
      .toLowerCase();
    const normalized = (email ?? '').trim().toLowerCase();
    if (!allowed || !normalized || normalized !== allowed) {
      throw new ForbiddenException('Esta cuenta no tiene acceso');
    }
    return normalized;
  }

  sign(user: AuthUser): string {
    return this.jwt.sign(
      { sub: user.email, name: user.name },
      { expiresIn: '30d' },
    );
  }

  cookieOptions() {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: SESSION_MS,
      path: '/',
    };
  }
}
