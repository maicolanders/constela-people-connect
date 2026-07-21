import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService, AuthTokenStore, HabitanteAuthService, HabitanteAuthTokenStore } from '@censo/web-shared-data-access';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

const RUTAS_SIN_TOKEN = ['/api/auth/login', '/api/auth/refresh'];
const RUTAS_AUTOGESTION_SIN_TOKEN = ['/api/poblacion/habitantes/auth/'];

/**
 * Fase 14 (autogestión): las rutas del portal del habitante contienen
 * literalmente `/mi-` (mi-perfil, mi-contacto, mi-hogar, mi-registro,
 * mi-constancia) — criterio simple y verificable para distinguirlas de las
 * rutas de staff sin mantener una lista exhaustiva de endpoints.
 */
function esRutaAutogestion(url: string): boolean {
  return url.includes('/mi-') || RUTAS_AUTOGESTION_SIN_TOKEN.some((ruta) => url.startsWith(ruta));
}

/**
 * Adjunta el access token a cada petición a la API y, ante un 401 (token
 * expirado), intenta refrescar la sesión una vez y reintenta la petición
 * original antes de forzar logout. Distingue por URL entre la sesión de
 * staff (`AuthTokenStore`/`AuthService`) y la sesión de autogestión del
 * habitante (`HabitanteAuthTokenStore`/`HabitanteAuthService`, Fase 14) —
 * son dos actores distintos que pueden tener sesión simultánea en el mismo
 * navegador, cada uno con su propio almacenamiento y su propio flujo de
 * refresh/logout.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(AuthTokenStore);
  const authService = inject(AuthService);
  const habitanteTokenStore = inject(HabitanteAuthTokenStore);
  const habitanteAuthService = inject(HabitanteAuthService);
  const router = inject(Router);

  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  const esAutogestion = esRutaAutogestion(req.url);
  const store = esAutogestion ? habitanteTokenStore : tokenStore;
  const rutasSinToken = esAutogestion ? RUTAS_AUTOGESTION_SIN_TOKEN : RUTAS_SIN_TOKEN;
  const requiereToken = !rutasSinToken.some((ruta) => req.url.startsWith(ruta));
  const accessToken = store.obtenerAccessToken();

  const solicitud = requiereToken && accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  return next(solicitud).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && requiereToken) {
        const refrescar = esAutogestion ? habitanteAuthService.refrescarSesion() : authService.refrescarSesion();
        return from(refrescar).pipe(
          switchMap(() => {
            const nuevoToken = store.obtenerAccessToken();
            const solicitudReintentada = nuevoToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${nuevoToken}` } })
              : req;
            return next(solicitudReintentada);
          }),
          catchError((errorRefresh: unknown) => {
            if (esAutogestion) {
              habitanteAuthService.cerrarSesion();
              void router.navigate(['/autogestion/login']);
            } else {
              authService.cerrarSesion();
              void router.navigate(['/login']);
            }
            return throwError(() => errorRefresh);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
