import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      query?: { client?: string };
      url?: string;
    }>();
    // En el callback Google ya trae `state`; no pisarlo.
    if ((req.url ?? '').includes('/callback')) {
      return {};
    }
    return { state: req.query?.client === 'mobile' ? 'mobile' : 'web' };
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: { message?: string } | string | undefined,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const infoMsg = typeof info === 'string' ? info : info?.message;
      const message = err?.message || infoMsg || 'acceso denegado';
      if (err instanceof ForbiddenException) {
        throw err;
      }
      if (message.toLowerCase().includes('no tiene acceso')) {
        throw new ForbiddenException(message);
      }
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
