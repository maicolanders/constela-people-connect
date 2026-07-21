import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { HabitanteAutenticado } from './habitante-autenticado';

interface RequestConHabitante {
  user?: HabitanteAutenticado;
}

export const CurrentHabitante = createParamDecorator((_data: unknown, ctx: ExecutionContext): HabitanteAutenticado | undefined => {
  const request = ctx.switchToHttp().getRequest<RequestConHabitante>();
  return request.user;
});
