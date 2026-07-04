import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Punto único de logging de errores HTTP. No registra el cuerpo de la
 * petición (podría traer campos sensibles, CLAUDE.md), solo método/URL/status.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        console.error(`[HTTP ${error.status}] ${req.method} ${req.url}`);
      }
      return throwError(() => error);
    }),
  );
