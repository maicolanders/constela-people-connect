import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService, AuthTokenStore } from '@censo/web-shared-data-access';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

const RUTAS_SIN_TOKEN = ['/api/auth/login', '/api/auth/refresh'];

/**
 * Adjunta el access token a cada petición a la API y, ante un 401 (token
 * expirado), intenta refrescar la sesión una vez y reintenta la petición
 * original antes de forzar logout.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(AuthTokenStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiereToken = req.url.startsWith('/api') && !RUTAS_SIN_TOKEN.some((ruta) => req.url.startsWith(ruta));
  const accessToken = tokenStore.obtenerAccessToken();

  const solicitud = requiereToken && accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  return next(solicitud).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && requiereToken) {
        return from(authService.refrescarSesion()).pipe(
          switchMap(() => {
            const nuevoToken = tokenStore.obtenerAccessToken();
            const solicitudReintentada = nuevoToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${nuevoToken}` } })
              : req;
            return next(solicitudReintentada);
          }),
          catchError((errorRefresh: unknown) => {
            authService.cerrarSesion();
            void router.navigate(['/login']);
            return throwError(() => errorRefresh);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
