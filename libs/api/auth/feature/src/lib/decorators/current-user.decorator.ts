import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';

interface RequestConUsuario {
  user?: UsuarioAutenticado;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UsuarioAutenticado | undefined => {
  const request = ctx.switchToHttp().getRequest<RequestConUsuario>();
  return request.user;
});
