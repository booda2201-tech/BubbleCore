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

const NOTES_MAX = 500;

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
  protected readonly notes = signal('');
  protected readonly step = signal(0);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly submitError = signal('');
  protected readonly stepHint = signal('');
  protected readonly notesMax = NOTES_MAX;

  protected readonly questions = computed(() =>
    [...(this.survey()?.questions ?? [])].sort((a, b) => a.order - b.order),
  );

  /** Rating / choice / number steps — text questions are folded into the final notes step. */
  protected readonly stepQuestions = computed(() =>
    this.questions().filter((question) => question.type !== 'Text'),
  );

  /** Prefer an explicit notes/suggestion text question; otherwise the last Text question. */
  protected readonly notesQuestion = computed(() => {
    const textQuestions = this.questions().filter((question) => question.type === 'Text');
    if (!textQuestions.length) return null;
    const keyed = textQuestions.find((question) => isNotesKey(question.key));
    return keyed ?? textQuestions[textQuestions.length - 1];
  });

  protected readonly totalSteps = computed(() => this.stepQuestions().length + 1);

  protected readonly currentQuestion = computed(
    () => this.stepQuestions()[this.step()] ?? null,
  );

  protected readonly isNotesStep = computed(() => this.step() >= this.stepQuestions().length);

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
    const questionsOk = this.stepQuestions()
      .filter((question) => question.isRequired)
      .every((question) => this.isAnswered(question));
    if (!questionsOk) return false;
    const notesQuestion = this.notesQuestion();
    if (notesQuestion?.isRequired && !this.notes().trim()) return false;
    return true;
  });

  /** Progress by current step, not just answered count — clearer for a wizard. */
  protected readonly progress = computed(() => {
    const total = this.totalSteps();
    if (!total) return 0;
    return ((this.step() + 1) / total) * 100;
  });

  protected readonly currentAnswered = computed(() => {
    if (this.isNotesStep()) {
      const notesQuestion = this.notesQuestion();
      return notesQuestion?.isRequired ? this.notes().trim().length > 0 : true;
    }
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

  protected onNotes(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value.slice(0, NOTES_MAX);
    this.notes.set(value);
    this.stepHint.set('');

    const notesQuestion = this.notesQuestion();
    if (notesQuestion) {
      this.patch(notesQuestion.id, { textValue: value });
    }
  }

  protected onNumber(questionId: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.patch(questionId, { numberValue: raw === '' ? null : Number(raw) });
    this.stepHint.set('');
  }

  protected goNext(): void {
    this.clearAdvanceTimer();

    if (this.isNotesStep()) {
      const notesQuestion = this.notesQuestion();
      if (notesQuestion?.isRequired && !this.notes().trim()) {
        this.stepHint.set('اكتب ملاحظتك عشان تكمل');
        return;
      }
      this.stepHint.set('');
      void this.submit();
      return;
    }

    const question = this.currentQuestion();
    if (!question) return;

    if (question.isRequired && !this.isAnswered(question)) {
      this.stepHint.set('جاوب على السؤال ده عشان تكمل');
      return;
    }

    this.stepHint.set('');
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
      for (let i = 0; i < Math.min(index, this.stepQuestions().length); i++) {
        const question = this.stepQuestions()[i];
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
      const firstMissing = this.stepQuestions().findIndex(
        (question) => question.isRequired && !this.isAnswered(question),
      );
      if (firstMissing >= 0) {
        this.step.set(firstMissing);
        this.stepHint.set('جاوب على الأسئلة المطلوبة أولاً');
        return;
      }
      if (this.notesQuestion()?.isRequired && !this.notes().trim()) {
        this.step.set(this.totalSteps() - 1);
        this.stepHint.set('اكتب ملاحظتك عشان تكمل');
      }
      return;
    }

    const customer = this.customer();
    this.submitting.set(true);
    this.submitError.set('');

    try {
      const notes = this.notes().trim();
      await this.api.submitPublicResponse({
        customerName: customer?.name ?? 'زائر',
        phoneNumber: customer?.phone || null,
        branchId: customer?.branchId,
        notes: notes || null,
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

  protected notesStepAnswered(): boolean {
    return this.notes().trim().length > 0;
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
    this.notes.set('');
    this.answers.set({});

    try {
      this.store.survey.set(await this.api.getPublicSurvey());
      this.hydrateNotesFromTextQuestion();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private hydrateNotesFromTextQuestion(): void {
    const notesQuestion = this.notesQuestion();
    if (!notesQuestion) return;
    const existing = this.draft(notesQuestion.id).textValue;
    if (existing) this.notes.set(existing);
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
    const notes = this.notes().trim();
    const notesQuestion = this.notesQuestion();

    return this.questions().flatMap((question) => {
      if (question.type === 'Text') {
        if (notesQuestion && question.id === notesQuestion.id) {
          if (!notes) return [];
          return [{ questionId: question.id, textValue: notes }];
        }
        // Other text questions stay out of the wizard; skip unless already drafted.
        if (!this.isAnswered(question)) return [];
      } else if (!this.isAnswered(question)) {
        return [];
      }

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

function isNotesKey(key: string | null): boolean {
  if (!key) return false;
  const normalized = key.trim().toLowerCase();
  return /notes?|note|suggestion|comment|feedback|ملاحظة|ملاحظات|اقتراح/.test(normalized);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
