import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { tieneAccesoComunidad } from '../util/comunidad-acceso.util';

interface RequestConUsuario extends Request {
  user?: UsuarioAutenticado;
}

/**
 * Complementa a RolesGuard: valida que, para alguno de los roles requeridos
 * por la ruta, el usuario tenga una asignación global (comunidadId null) o
 * una asignación explícita a la comunidad solicitada (CLAUDE.md: los
 * endpoints de datos individuales validan rol Y pertenencia a comunidad).
 * Si la ruta no trae `comunidadId`, no aplica ninguna restricción aquí.
 */
@Injectable()
export class ComunidadScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const comunidadId = this.extraerComunidadId(request);
    if (comunidadId === null) {
      return true;
    }

    const rolesRequeridos = this.reflector.getAllAndOverride<RolCodigo[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const asignaciones = request.user?.asignaciones ?? [];

    if (!tieneAccesoComunidad(asignaciones, comunidadId, rolesRequeridos)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }

    return true;
  }

  private extraerComunidadId(request: Request): number | null {
    const candidato =
      (request.params as Record<string, string>)?.['comunidadId'] ??
      (request.body as Record<string, unknown>)?.['comunidadId'] ??
      (request.query as Record<string, string>)?.['comunidadId'];

    if (candidato === undefined) return null;
    const id = Number(candidato);
    return Number.isFinite(id) ? id : null;
  }
}
