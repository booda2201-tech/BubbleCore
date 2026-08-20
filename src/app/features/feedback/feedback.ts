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
  protected readonly step = signal(0);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly submitError = signal('');
  protected readonly stepHint = signal('');

  protected readonly questions = computed(() =>
    [...(this.survey()?.questions ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly totalSteps = computed(() => this.questions().length);

  protected readonly currentQuestion = computed(
    () => this.questions()[this.step()] ?? null,
  );

  protected readonly isFirst = computed(() => this.step() <= 0);

  protected readonly isLast = computed(() => {
    const total = this.totalSteps();
    return total > 0 && this.step() >= total - 1;
  });

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

  /** Progress by current step, not just answered count — clearer for a wizard. */
  protected readonly progress = computed(() => {
    const total = this.totalSteps();
    if (!total) return 0;
    return ((this.step() + 1) / total) * 100;
  });

  protected readonly currentAnswered = computed(() => {
    const question = this.currentQuestion();
    return question ? this.isAnswered(question) : false;
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
    this.stepHint.set('');
    if (value > 0) this.autoAdvance();
  }

  protected toggleSingle(questionId: number, optionId: number): void {
    const current = this.draft(questionId).selectedOptionId;
    const next = current === optionId ? null : optionId;
    this.patch(questionId, { selectedOptionId: next });
    this.stepHint.set('');
    if (next !== null) this.autoAdvance();
  }

  protected toggleMultiple(questionId: number, optionId: number): void {
    const current = this.draft(questionId).selectedOptionIds;
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    this.patch(questionId, { selectedOptionIds: next });
    this.stepHint.set('');
  }

  protected onText(question: PublicQuestion, event: Event): void {
    const max = question.maxLength ?? 500;
    const value = (event.target as HTMLTextAreaElement).value.slice(0, max);
    this.patch(question.id, { textValue: value });
    this.stepHint.set('');
  }

  protected onNumber(questionId: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.patch(questionId, { numberValue: raw === '' ? null : Number(raw) });
    this.stepHint.set('');
  }

  protected goNext(): void {
    this.clearAdvanceTimer();
    const question = this.currentQuestion();
    if (!question) return;

    if (question.isRequired && !this.isAnswered(question)) {
      this.stepHint.set('جاوب على السؤال ده عشان تكمل');
      return;
    }

    this.stepHint.set('');
    if (this.isLast()) {
      void this.submit();
      return;
    }

    this.step.update((value) => Math.min(value + 1, this.totalSteps() - 1));
  }

  protected goPrev(): void {
    this.clearAdvanceTimer();
    this.stepHint.set('');
    this.submitError.set('');
    this.step.update((value) => Math.max(value - 1, 0));
  }

  protected goTo(index: number): void {
    if (index < 0 || index >= this.totalSteps()) return;
    this.clearAdvanceTimer();

    // Allow jumping back freely; jumping forward only through already-answered required steps.
    if (index > this.step()) {
      for (let i = 0; i < index; i++) {
        const question = this.questions()[i];
        if (question?.isRequired && !this.isAnswered(question)) {
          this.step.set(i);
          this.stepHint.set('جاوب على الأسئلة المطلوبة بالترتيب');
          return;
        }
      }
    }

    this.stepHint.set('');
    this.step.set(index);
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) {
      const firstMissing = this.questions().findIndex(
        (question) => question.isRequired && !this.isAnswered(question),
      );
      if (firstMissing >= 0) {
        this.step.set(firstMissing);
        this.stepHint.set('جاوب على الأسئلة المطلوبة أولاً');
      }
      return;
    }

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

  protected isAnsweredPublic(question: PublicQuestion): boolean {
    return this.isAnswered(question);
  }

  private advanceTimer: ReturnType<typeof setTimeout> | null = null;

  private clearAdvanceTimer(): void {
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
  }

  private autoAdvance(): void {
    if (this.isLast()) return;
    this.clearAdvanceTimer();
    // Brief pause so the selection highlight registers before the card swaps.
    this.advanceTimer = setTimeout(() => {
      this.advanceTimer = null;
      if (!this.isLast() && this.currentAnswered()) {
        this.stepHint.set('');
        this.step.update((value) => Math.min(value + 1, this.totalSteps() - 1));
      }
    }, 280);
  }

  private async loadSurvey(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.step.set(0);

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
