import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { environment } from '../../environments/environment';
import { AdminAuth } from './admin-auth';
import { SurveyChannel, SurveyContext } from './survey-context';

export function channelGuard(channel: SurveyChannel): CanActivateFn {
  return () => {
    const context = inject(SurveyContext);
    if (channel === 'expo') context.useExpo();
    else context.useStore();
    return true;
  };
}

/**
 * /admin and /cashier follow the survey the staff session is pinned to,
 * so an expo login never silently flips back to the store channel.
 */
export const staffChannelGuard: CanActivateFn = () => {
  const context = inject(SurveyContext);
  const slug = inject(AdminAuth).surveyAccess()?.slug;

  if (slug === environment.expoSurveySlug) context.useExpo();
  else context.useStore();
  return true;
};
