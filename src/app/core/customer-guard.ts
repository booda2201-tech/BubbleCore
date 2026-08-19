import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeedbackStore } from './feedback-store';

/** The feedback form needs a visitor captured on the welcome screen. */
export const customerGuard: CanActivateFn = () => {
  if (inject(FeedbackStore).customer()) return true;

  return inject(Router).createUrlTree(['/']);
};
