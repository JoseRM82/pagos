import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(UnauthorizedException, ForbiddenException)
export class AuthRedirectFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ url?: string }>();

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

    const front = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const raw = exception.message || 'acceso denegado';
    const reason = encodeURIComponent(raw);
    res.redirect(`${front}?auth=denied&reason=${reason}`);
  }
}
