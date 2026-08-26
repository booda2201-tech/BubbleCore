import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from './admin-auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);

  if (!auth.isUnlocked()) return router.createUrlTree(['/']);
  if (auth.isCashier()) return router.createUrlTree(['/cashier']);
  if (auth.isAdmin()) return true;

  auth.lock();
  return router.createUrlTree(['/']);
};
