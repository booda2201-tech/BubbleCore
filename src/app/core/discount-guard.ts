import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeedbackStore } from './feedback-store';
import { SurveyContext } from './survey-context';

export const discountGuard: CanActivateFn = () => {
  if (inject(FeedbackStore).discount()?.code) return true;
  return inject(Router).createUrlTree([inject(SurveyContext).paths().welcome]);
};
