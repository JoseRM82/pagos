import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { frontendUrl, mobileRedirectUrl } from './frontend-url';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthRedirectFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ url?: string; query?: { state?: string } }>();

    const isGoogleCallback =
      typeof req.url === 'string' &&
      req.url.includes('/auth/google/callback');

    if (!isGoogleCallback) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (!res.headersSent) {
        res.status(status).json(
          typeof body === 'string' ? { message: body } : body,
        );
      }
      return;
    }

    if (res.headersSent) return;

    const dest =
      req.query?.state === 'mobile' ? mobileRedirectUrl() : frontendUrl();
    const raw = exception.message || 'acceso denegado';
    const reason = encodeURIComponent(raw);
    res.redirect(`${dest}?auth=denied&reason=${reason}`);
  }
}
