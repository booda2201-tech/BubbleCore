import { Service, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { FeedbackStore } from './feedback-store';

export type SurveyChannel = 'store' | 'expo';

@Service()
export class SurveyContext {
  private readonly store = inject(FeedbackStore);

  private readonly channelSignal = signal<SurveyChannel>(readStoredChannel());

  readonly channel = this.channelSignal.asReadonly();
  readonly isExpo = computed(() => this.channelSignal() === 'expo');
  readonly slug = computed(() =>
    this.channelSignal() === 'expo' ? environment.expoSurveySlug : environment.surveySlug,
  );

  /** Absolute app paths scoped to the active channel. */
  readonly paths = computed(() => pathsFor(this.channelSignal()));

  useStore(): void {
    this.setChannel('store');
  }

  useExpo(): void {
    this.setChannel('expo');
  }

  private setChannel(channel: SurveyChannel): void {
    if (this.channelSignal() === channel) {
      persistChannel(channel);
      return;
    }

    this.channelSignal.set(channel);
    persistChannel(channel);
    // Never carry a visitor/discount from one channel into the other.
    this.store.customer.set(null);
    this.store.survey.set(null);
    this.store.discount.set(null);
  }
}

function pathsFor(channel: SurveyChannel) {
  const root = channel === 'expo' ? '/expo' : '';
  return {
    language: channel === 'expo' ? '/expo' : '/',
    welcome: `${root}/welcome`,
    feedback: `${root}/feedback`,
    discountCode: `${root}/discount-code`,
    claimDiscount: `${root}/claim-discount`,
  };
}

function readStoredChannel(): SurveyChannel {
  if (typeof sessionStorage === 'undefined') return 'store';
  return sessionStorage.getItem('bubble-core.survey-channel') === 'expo' ? 'expo' : 'store';
}

function persistChannel(channel: SurveyChannel): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem('bubble-core.survey-channel', channel);
}
