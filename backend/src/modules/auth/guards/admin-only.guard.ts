import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { RequestWithAuthUser } from '../types/request-with-auth-user.type';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();

    if (request.user?.actorType !== 'admin') {
      throw new ForbiddenException('Admin access is required');
    }

    return true;
  }
}
