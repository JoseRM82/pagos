import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthRedirectFilter } from './auth-redirect.filter';
import { AuthService, AuthUser, SESSION_COOKIE } from './auth.service';
import { frontendUrl, mobileRedirectUrl } from './frontend-url';
import { GoogleAuthGuard } from './google-auth.guard';

function isMobileOAuth(req: Request): boolean {
  return req.query?.state === 'mobile';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(AuthRedirectFilter)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    if (res.headersSent) {
      return;
    }

    const user = req.user as AuthUser | undefined;
    const mobile = isMobileOAuth(req);
    const dest = mobile ? mobileRedirectUrl() : frontendUrl();
    if (!user) {
      return res.redirect(`${dest}?auth=denied&reason=sin_usuario`);
    }

    const token = this.authService.sign(user);
    if (mobile) {
      return res.redirect(`${dest}?token=${encodeURIComponent(token)}`);
    }

    res.cookie(SESSION_COOKIE, token, this.authService.cookieOptions());
    return res.redirect(dest);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: Request) {
    return req.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    return { ok: true };
  }
}
