import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, pattern, required, submit } from '@angular/forms/signals';
import { DiscountCheck, IssueDiscountResult } from '../../core/api-models';
import { DiscountClient } from '../../core/discount-client';
import { FeedbackStore } from '../../core/feedback-store';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';

@Component({
  selector: 'app-claim-discount',
  imports: [FormField, RouterLink, DatePipe],
  templateUrl: './claim-discount.html',
  styleUrl: './claim-discount.scss',
})
export class ClaimDiscountComponent {
  private readonly api = inject(SurveyApi);
  private readonly discount = inject(DiscountClient);
  private readonly store = inject(FeedbackStore);
  private readonly router = inject(Router);

  protected readonly model = signal({ mobile: '' });
  protected readonly claimForm = form(this.model, (schema) => {
    required(schema.mobile, { message: 'من فضلك أدخل رقم الموبايل' });
    pattern(schema.mobile, /^[0-9+\s-]{9,15}$/, {
      message: 'من فضلك أدخل رقم موبايل صحيح',
    });
  });

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly copied = signal(false);
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly issued = this.store.discount;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.claimForm, async () => {
      await this.claim();
    });
  }

  protected async claim(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);

    try {
      await this.discount.ensureSession();
      const check = await this.api.checkDiscount(this.model().mobile.trim());
      const issued = toIssued(check);

      if (!issued.code) {
        this.store.discount.set(null);
        this.error.set(
          check.message?.trim() ||
            (check.usedBefore
              ? 'الكود المرتبط بالرقم ده مستخدم قبل كده.'
              : check.expiredBefore
                ? 'كود الخصم السابق على الرقم ده انتهى.'
                : 'لا يوجد كود خصم مرتبط بهذا الرقم.'),
        );
        return;
      }

      this.store.discount.set(issued);
    } catch (error) {
      this.error.set(claimError(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyCode(): Promise<void> {
    const code = this.issued()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
    this.copied.set(true);
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copied.set(false), 2200);
  }

  protected openCodeScreen(): void {
    this.router.navigate(['/discount-code']);
  }
}

function toIssued(check: DiscountCheck): IssueDiscountResult {
  return {
    hasActiveCode: check.hasCode,
    code: check.code,
    discountPercent: check.discountPercent,
    expiresAt: check.expiresAt,
    status: check.status,
    alreadyIssued: check.hasCode,
    message: check.message,
  };
}

function claimError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message || 'لا يوجد تقييم مرتبط بهذا الرقم';
  }
  return 'حصل خطأ غير متوقع.';
}
