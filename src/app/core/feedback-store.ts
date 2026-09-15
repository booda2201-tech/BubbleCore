import { Service, signal } from '@angular/core';
import { IssueDiscountResult, PublicSurvey } from './api-models';
import { Customer } from './models';

@Service()
export class FeedbackStore {
  /** Customer captured on the welcome screen, carried into the feedback form. */
  readonly customer = signal<Customer | null>(null);

  /** Public survey from GET /public/surveys/{slug}, including its branches. */
  readonly survey = signal<PublicSurvey | null>(null);

  /** Discount issued or recovered for the current customer session. */
  readonly discount = signal<IssueDiscountResult | null>(null);
}
