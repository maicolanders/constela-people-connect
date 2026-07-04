import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenStore } from '@censo/web-shared-data-access';

export const authGuard: CanActivateFn = () => {
  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);

  if (tokenStore.autenticado()) {
    return true;
  }
  return router.parseUrl('/login');
};
