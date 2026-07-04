import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@censo/web-shared-data-access';

/**
 * Complementa a authGuard: la ruta declara `data: { roles: ['administrador'] }`
 * y este guard valida contra el perfil actual (GET /auth/me).
 */
export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesRequeridos = (route.data['roles'] as string[] | undefined) ?? [];
  if (rolesRequeridos.length === 0) {
    return true;
  }

  try {
    const perfil = await authService.obtenerPerfil();
    const autorizado = perfil.roles.some((rol) => rolesRequeridos.includes(rol));
    return autorizado ? true : router.parseUrl('/');
  } catch {
    return router.parseUrl('/login');
  }
};
