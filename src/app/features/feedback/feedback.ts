import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FeedbackStore } from '../../core/feedback-store';
import { ChoiceId, PRICE_OPTIONS, RECOMMEND_OPTIONS, STAR_QUESTIONS } from '../../core/models';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

@Component({
  selector: 'app-feedback',
  imports: [StarRatingComponent, DecimalPipe],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackComponent {
  private readonly store = inject(FeedbackStore);
  private readonly router = inject(Router);

  protected readonly starQuestions = STAR_QUESTIONS;
  protected readonly priceOptions = PRICE_OPTIONS;
  protected readonly recommendOptions = RECOMMEND_OPTIONS;

  protected readonly customer = this.store.customer;

  /** Star ratings stored as string ids ("1"…"5"), keyed by question id. */
  protected readonly ratingChoices = signal<Record<string, string | null>>({});
  protected readonly priceValue = signal<ChoiceId | null>(null);
  protected readonly recommend = signal<ChoiceId | null>(null);
  protected readonly suggestion = signal('');
  protected readonly submitted = signal(false);

  protected readonly maxSuggestion = 500;

  protected readonly ratings = computed(() => {
    const numeric: Record<string, number> = {};
    for (const [id, choice] of Object.entries(this.ratingChoices())) {
      if (choice) numeric[id] = Number(choice);
    }
    return numeric;
  });

  protected readonly overall = computed(() => FeedbackStore.overallOf(this.ratings()));

  protected readonly canSubmit = computed(() => (this.ratings()['drink'] ?? 0) > 0);

  protected readonly progress = computed(() => {
    const answered = [
      ...this.starQuestions.map((question) => !!this.ratingChoices()[question.id]),
      this.priceValue() !== null,
      this.recommend() !== null,
      this.suggestion().trim().length > 0,
    ];
    return (answered.filter(Boolean).length / answered.length) * 100;
  });

  protected ratingChoice(id: string): string | null {
    return this.ratingChoices()[id] ?? null;
  }

  protected setRatingChoice(id: string, value: string | null): void {
    this.ratingChoices.update((current) => ({ ...current, [id]: value }));
  }

  protected onSuggestion(event: Event): void {
    this.suggestion.set((event.target as HTMLTextAreaElement).value.slice(0, this.maxSuggestion));
  }

  protected submit(): void {
    if (!this.canSubmit()) return;

    const customer = this.customer();
    this.store.add({
      name: customer?.name ?? 'زائر',
      phone: customer?.phone ?? '',
      rating: this.overall(),
      ratings: this.ratings(),
      priceValue: this.priceValue(),
      recommend: this.recommend(),
      suggestion: this.suggestion().trim(),
    });

    this.submitted.set(true);
  }

  protected finish(): void {
    this.store.customer.set(null);
    this.router.navigate(['/']);
  }
}
