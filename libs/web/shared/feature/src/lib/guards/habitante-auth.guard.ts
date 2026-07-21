import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HabitanteAuthTokenStore } from '@censo/web-shared-data-access';

/** Fase 14 (autogestión): mismo patrón que `authGuard`, contra la sesión del habitante. */
export const habitanteAuthGuard: CanActivateFn = () => {
  const tokenStore = inject(HabitanteAuthTokenStore);
  const router = inject(Router);

  if (tokenStore.autenticado()) {
    return true;
  }
  return router.parseUrl('/autogestion/login');
};
