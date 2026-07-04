import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestConUsuario {
  user?: UsuarioAutenticado;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolCodigo[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const tieneRol = request.user?.roles.some((rol) => rolesRequeridos.includes(rol)) ?? false;

    if (!tieneRol) {
      throw new ForbiddenException('No tiene el rol requerido para esta acción');
    }

    return true;
  }
}
