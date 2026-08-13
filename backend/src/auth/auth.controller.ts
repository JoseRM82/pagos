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
import { GoogleAuthGuard } from './google-auth.guard';

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
    if (!user) {
      const front = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      return res.redirect(`${front}?auth=denied&reason=sin_usuario`);
    }

    const token = this.authService.sign(user);
    res.cookie(SESSION_COOKIE, token, this.authService.cookieOptions());
    const front = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    return res.redirect(front);
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
