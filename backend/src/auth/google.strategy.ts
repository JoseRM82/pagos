import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthService, AuthUser } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    try {
      const json = profile._json as { email?: string } | undefined;
      const email = profile.emails?.[0]?.value ?? json?.email;
      if (!email) {
        done(new Error('Google no devolvió un email'), undefined);
        return;
      }
      const allowed = this.authService.assertAllowedEmail(email);
      const user: AuthUser = {
        email: allowed,
        name: profile.displayName ?? allowed,
      };
      done(null, user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo validar la cuenta';
      done(new Error(message), undefined);
    }
  }
}
