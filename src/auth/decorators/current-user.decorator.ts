import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request || !request.user) {
      return null;
    }
    return data ? request.user[data] : request.user;
  },
);
