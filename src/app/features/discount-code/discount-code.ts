import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FeedbackStore } from '../../core/feedback-store';
import { SurveyContext } from '../../core/survey-context';

@Component({
  selector: 'app-discount-code',
  imports: [DatePipe],
  templateUrl: './discount-code.html',
  styleUrl: './discount-code.scss',
})
export class DiscountCodeComponent {
  private readonly store = inject(FeedbackStore);
  private readonly router = inject(Router);
  private readonly context = inject(SurveyContext);

  protected readonly discount = this.store.discount;
  protected readonly copied = signal(false);
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  protected async copyCode(): Promise<void> {
    const code = this.discount()?.code;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const field = document.createElement('textarea');
      field.value = code;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }

    this.copied.set(true);
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copied.set(false), 2200);
  }

  protected continueHome(): void {
    this.store.customer.set(null);
    this.store.discount.set(null);
    this.router.navigate([this.context.paths().language]);
  }
}
