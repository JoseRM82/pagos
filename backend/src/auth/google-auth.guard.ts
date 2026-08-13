import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: { message?: string } | string | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const res = context.switchToHttp().getResponse();
      const front = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      const infoMsg =
        typeof info === 'string' ? info : info?.message;
      const reason = encodeURIComponent(
        err?.message || infoMsg || 'acceso denegado',
      );
      if (!res.headersSent) {
        res.redirect(`${front}?auth=denied&reason=${reason}`);
      }
      return undefined as TUser;
    }
    return user;
  }
}
