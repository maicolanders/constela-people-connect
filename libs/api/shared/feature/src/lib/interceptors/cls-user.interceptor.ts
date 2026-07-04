import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

interface RequestConUsuario {
  user?: { id?: number };
}

/**
 * Copia el usuario autenticado (poblado por el guard de JWT del dominio auth,
 * vía Passport en `request.user`) al contexto CLS, para que AuditSubscriber
 * pueda leer quién hizo el cambio sin que libs/api/shared dependa de
 * domain:auth. Debe registrarse como interceptor global en AppModule, después
 * de que corran los guards de autenticación (los interceptores siempre
 * corren después de los guards en el ciclo de vida de Nest).
 */
@Injectable()
export class ClsUserInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    this.cls.set('userId', request.user?.id ?? null);
    return next.handle();
  }
}
