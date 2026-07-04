import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { getCamposSensibles } from '@censo/api-shared-data-access';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface RequestConUsuario {
  user?: { roles?: string[] };
}

const ROLES_SIN_RESTRICCION = ['administrador'];

/**
 * Redacta en la respuesta los campos marcados con @CampoSensible() cuando el
 * rol del solicitante no está autorizado a verlos. Por defecto solo
 * 'administrador' ve el valor real; cada dominio puede afinar esta regla más
 * adelante (p.ej. líder comunitario ve etnia de su propia comunidad).
 */
@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const roles = request.user?.roles ?? [];

    return next.handle().pipe(map((data) => this.redactar(data, roles)));
  }

  private redactar(data: unknown, roles: string[]): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.redactar(item, roles));
    }
    if (data === null || typeof data !== 'object') {
      return data;
    }

    const camposSensibles = getCamposSensibles(data.constructor as new (...args: never[]) => unknown);
    if (Object.keys(camposSensibles).length === 0) {
      return data;
    }

    const copia: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const [campo, opciones] of Object.entries(camposSensibles)) {
      const rolesAutorizados: string[] = [...ROLES_SIN_RESTRICCION, ...(opciones.rolesPermitidos ?? [])];
      const autorizado = roles.some((rol) => rolesAutorizados.includes(rol));
      if (!autorizado && campo in copia) {
        copia[campo] = undefined;
      }
    }
    return copia;
  }
}
