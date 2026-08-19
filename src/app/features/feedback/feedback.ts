import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PublicQuestion, SubmitAnswer } from '../../core/api-models';
import { FeedbackStore } from '../../core/feedback-store';
import { displayIcon } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

interface AnswerDraft {
  ratingValue: number | null;
  selectedOptionId: number | null;
  selectedOptionIds: number[];
  textValue: string;
  numberValue: number | null;
}

@Component({
  selector: 'app-feedback',
  imports: [StarRatingComponent, DecimalPipe],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackComponent {
  private readonly store = inject(FeedbackStore);
  private readonly api = inject(SurveyApi);
  private readonly router = inject(Router);

  protected readonly customer = this.store.customer;
  protected readonly survey = this.store.survey;
  protected readonly answers = signal<Record<number, AnswerDraft>>({});
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly submitError = signal('');

  protected readonly questions = computed(() =>
    [...(this.survey()?.questions ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly overall = computed(() => {
    const scores = this.questions()
      .filter((question) => question.type === 'Rating')
      .map((question) => this.draft(question.id).ratingValue)
      .filter((value): value is number => typeof value === 'number' && value > 0);

    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  });

  protected readonly canSubmit = computed(() => {
    if (!this.survey() || this.submitting()) return false;
    return this.questions()
      .filter((question) => question.isRequired)
      .every((question) => this.isAnswered(question));
  });

  protected readonly progress = computed(() => {
    const list = this.questions();
    if (!list.length) return 0;
    return (list.filter((question) => this.isAnswered(question)).length / list.length) * 100;
  });

  constructor() {
    void this.loadSurvey();
  }

  protected icon(value?: string | null): string {
    return displayIcon(value);
  }

  protected draft(questionId: number): AnswerDraft {
    return this.answers()[questionId] ?? emptyDraft();
  }

  protected setRating(questionId: number, value: number): void {
    this.patch(questionId, { ratingValue: value > 0 ? value : null });
  }

  protected toggleSingle(questionId: number, optionId: number): void {
    const current = this.draft(questionId).selectedOptionId;
    this.patch(questionId, { selectedOptionId: current === optionId ? null : optionId });
  }

  protected toggleMultiple(questionId: number, optionId: number): void {
    const current = this.draft(questionId).selectedOptionIds;
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    this.patch(questionId, { selectedOptionIds: next });
  }

  protected onText(question: PublicQuestion, event: Event): void {
    const max = question.maxLength ?? 500;
    const value = (event.target as HTMLTextAreaElement).value.slice(0, max);
    this.patch(question.id, { textValue: value });
  }

  protected onNumber(questionId: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.patch(questionId, { numberValue: raw === '' ? null : Number(raw) });
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    const customer = this.customer();
    this.submitting.set(true);
    this.submitError.set('');

    try {
      await this.api.submitPublicResponse({
        customerName: customer?.name ?? 'زائر',
        phoneNumber: customer?.phone || null,
        branchId: customer?.branchId,
        answers: this.buildAnswers(),
      });
      this.submitted.set(true);
    } catch (error) {
      this.submitError.set(errorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  protected finish(): void {
    this.store.customer.set(null);
    this.router.navigate(['/']);
  }

  protected retry(): void {
    void this.loadSurvey();
  }

  private async loadSurvey(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      this.store.survey.set(await this.api.getPublicSurvey());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private isAnswered(question: PublicQuestion): boolean {
    const draft = this.draft(question.id);
    switch (question.type) {
      case 'Rating':
        return (draft.ratingValue ?? 0) > 0;
      case 'Number':
        return draft.numberValue !== null && !Number.isNaN(draft.numberValue);
      case 'Text':
        return draft.textValue.trim().length > 0;
      case 'SingleChoice':
      case 'YesNo':
        return draft.selectedOptionId !== null;
      case 'MultipleChoice':
        return draft.selectedOptionIds.length > 0;
      default:
        return false;
    }
  }

  private buildAnswers(): SubmitAnswer[] {
    return this.questions().flatMap((question) => {
      if (!this.isAnswered(question)) return [];
      const draft = this.draft(question.id);
      const answer: SubmitAnswer = { questionId: question.id };

      switch (question.type) {
        case 'Rating':
          answer.ratingValue = draft.ratingValue;
          break;
        case 'Number':
          answer.numberValue = draft.numberValue;
          break;
        case 'Text':
          answer.textValue = draft.textValue.trim();
          break;
        case 'SingleChoice':
        case 'YesNo':
          answer.selectedOptionId = draft.selectedOptionId;
          break;
        case 'MultipleChoice':
          answer.selectedOptionIds = draft.selectedOptionIds;
          break;
      }

      return [answer];
    });
  }

  private patch(questionId: number, partial: Partial<AnswerDraft>): void {
    this.answers.update((current) => ({
      ...current,
      [questionId]: { ...this.draft(questionId), ...partial },
    }));
  }
}

function emptyDraft(): AnswerDraft {
  return {
    ratingValue: null,
    selectedOptionId: null,
    selectedOptionIds: [],
    textValue: '',
    numberValue: null,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
