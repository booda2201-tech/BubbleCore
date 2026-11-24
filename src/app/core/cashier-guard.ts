import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuth } from './admin-auth';
import { SurveyContext } from './survey-context';

export const cashierGuard: CanActivateFn = () => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const home = inject(SurveyContext).paths().language;

  if (!auth.isUnlocked()) return router.createUrlTree([home]);
  if (auth.isAdmin()) return router.createUrlTree(['/admin']);
  if (auth.isCashier()) return true;

  auth.lock();
  return router.createUrlTree([home]);
};
