import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from './admin-auth';
import { SurveyContext } from './survey-context';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const home = inject(SurveyContext).paths().language;

  if (!auth.isUnlocked()) return router.createUrlTree([home]);
  if (auth.isCashier()) return router.createUrlTree(['/cashier']);
  if (auth.isAdmin()) return true;

  auth.lock();
  return router.createUrlTree([home]);
};
