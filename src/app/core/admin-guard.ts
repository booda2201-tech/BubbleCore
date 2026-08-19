import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from './admin-auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  if (auth.isUnlocked()) return true;

  return inject(Router).createUrlTree(['/']);
};
