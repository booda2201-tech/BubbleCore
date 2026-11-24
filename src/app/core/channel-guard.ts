import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SurveyChannel, SurveyContext } from './survey-context';

export function channelGuard(channel: SurveyChannel): CanActivateFn {
  return () => {
    const context = inject(SurveyContext);
    if (channel === 'expo') context.useExpo();
    else context.useStore();
    return true;
  };
}
