import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublicHandler = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());
    const isPublicClass = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getClass());
    if (isPublicHandler || isPublicClass) return true;
    return super.canActivate(context);
  }
}