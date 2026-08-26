import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from './admin-auth';

export const cashierGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);

  if (!auth.isUnlocked()) return router.createUrlTree(['/']);
  if (auth.isAdmin()) return router.createUrlTree(['/admin']);
  if (auth.isCashier()) return true;

  auth.lock();
  return router.createUrlTree(['/']);
};
