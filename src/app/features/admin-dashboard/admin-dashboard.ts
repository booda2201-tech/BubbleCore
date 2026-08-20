import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  ChoiceBreakdown,
  Kpi,
  QuestionDetails,
  ResponseAnswer,
  SurveyAnalytics,
  SurveyDetails,
  SurveyResponseRow,
} from '../../core/api-models';
import { AdminAuth } from '../../core/admin-auth';
import { FeedbackStore } from '../../core/feedback-store';
import { displayIcon, optionTone } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { AdminSurveyEditorComponent } from '../admin-survey-editor/admin-survey-editor';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

type InsightTab = 'distribution' | 'averages' | 'choices';

@Component({
  selector: 'app-admin-dashboard',
  imports: [StarRatingComponent, DecimalPipe, DatePipe, AdminSurveyEditorComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  private readonly api = inject(SurveyApi);
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackStore);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly exporting = signal(false);
  protected readonly deletingId = signal<number | null>(null);

  protected readonly surveyId = signal<number | null>(null);
  protected readonly surveyTitle = signal('تقييمات العملاء');
  protected readonly details = signal<SurveyDetails | null>(null);
  protected readonly questions = signal<QuestionDetails[]>([]);
  protected readonly analytics = signal<SurveyAnalytics | null>(null);
  protected readonly rows = signal<SurveyResponseRow[]>([]);
  protected readonly filteredTotal = signal(0);
  protected readonly view = signal<'dashboard' | 'editor'>('dashboard');

  protected readonly search = signal('');
  protected readonly starFilter = signal(0);
  protected readonly starOptions = [0, 5, 4, 3, 2, 1];

  /** Which response card/row has its answers expanded. */
  protected readonly expandedId = signal<number | null>(null);
  protected readonly insightTab = signal<InsightTab>('distribution');
  protected readonly selectedBreakdownId = signal<number | null>(null);

  protected readonly total = computed(() => this.analytics()?.totalResponses ?? 0);
  protected readonly averageRating = computed(() => this.analytics()?.averageRating ?? 0);
  protected readonly averageStars = computed(() => Math.round(this.averageRating()));
  protected readonly distribution = computed(() => this.analytics()?.ratingDistribution ?? []);
  protected readonly questionAverages = computed(() => this.analytics()?.ratingAverages ?? []);
  protected readonly choiceBreakdowns = computed(() => this.analytics()?.choiceBreakdowns ?? []);
  protected readonly kpis = computed(() => this.analytics()?.kpis ?? []);

  protected readonly activeBreakdown = computed(() => {
    const list = this.choiceBreakdowns();
    if (!list.length) return null;
    const selected = this.selectedBreakdownId();
    return list.find((item) => item.questionId === selected) ?? list[0];
  });

  constructor() {
    void this.refresh();
  }

  protected kpiTitle(kpi: Kpi): string {
    return shortenLabel(kpi.title, 40);
  }

  protected averageIcon(icon: string | null): string {
    return displayIcon(icon) || '★';
  }

  protected averageTitle(item: { questionId: number; title: string }): string {
    const question = this.questions().find((entry) => entry.id === item.questionId);
    return shortenLabel(question?.subtitle || question?.title || item.title, 32);
  }

  protected optionTone(value: string | null): string {
    return optionTone(value);
  }

  protected breakdownTitle(item: ChoiceBreakdown): string {
    return shortenLabel(item.title, 36);
  }

  protected questionLabel(question: QuestionDetails): string {
    return shortenLabel(question.subtitle || question.title, 40);
  }

  protected starLabel(stars: number): string {
    return stars === 0 ? 'الكل' : `${stars} نجوم`;
  }

  protected overallStars(row: SurveyResponseRow): number {
    return Math.round(row.averageRating ?? 0);
  }

  protected isExpanded(id: number): boolean {
    return this.expandedId() === id;
  }

  protected toggleExpand(id: number): void {
    this.expandedId.update((current) => (current === id ? null : id));
  }

  protected setInsightTab(tab: InsightTab): void {
    this.insightTab.set(tab);
  }

  protected selectBreakdown(questionId: number): void {
    this.selectedBreakdownId.set(questionId);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.reloadResponses(), 300);
  }

  protected setStarFilter(stars: number): void {
    this.starFilter.set(stars);
    void this.reloadResponses();
  }

  protected answer(row: SurveyResponseRow, questionId: number): ResponseAnswer | undefined {
    return row.answers.find((item) => item.questionId === questionId);
  }

  protected answerText(row: SurveyResponseRow, question: QuestionDetails): string {
    const answer = this.answer(row, question.id);
    if (!answer) return '—';
    if (answer.ratingValue != null) return String(answer.ratingValue);
    if (answer.numberValue != null) return String(answer.numberValue);
    if (answer.selectedOptionText) return answer.selectedOptionText;
    if (answer.selectedOptionTexts?.length) return answer.selectedOptionTexts.join('، ');
    if (answer.textValue?.trim()) return answer.textValue.trim();
    return '—';
  }

  protected isChoice(question: QuestionDetails): boolean {
    return question.type === 'SingleChoice' || question.type === 'YesNo';
  }

  protected isMulti(question: QuestionDetails): boolean {
    return question.type === 'MultipleChoice';
  }

  protected isText(question: QuestionDetails): boolean {
    return question.type === 'Text';
  }

  protected openEditor(): void {
    this.view.set('editor');
  }

  protected closeEditor(): void {
    this.view.set('dashboard');
  }

  protected async onEditorSaved(details: SurveyDetails): Promise<void> {
    this.applyDetails(details);
    this.feedback.survey.set(null);
    await Promise.all([this.loadAnalytics(details.id), this.loadResponses(details.id)]);
  }

  protected async exportExcel(): Promise<void> {
    const id = this.surveyId();
    if (!id || this.exporting()) return;

    this.exporting.set(true);
    try {
      const blob = await this.api.exportExcel(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${environment.surveySlug}-responses.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.exporting.set(false);
    }
  }

  protected async remove(id: number): Promise<void> {
    const surveyId = this.surveyId();
    if (!surveyId || this.deletingId()) return;

    this.deletingId.set(id);
    try {
      await this.api.deleteResponse(surveyId, id);
      if (this.expandedId() === id) this.expandedId.set(null);
      await Promise.all([this.loadAnalytics(surveyId), this.loadResponses(surveyId)]);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.deletingId.set(null);
    }
  }

  protected retry(): void {
    void this.refresh();
  }

  protected logout(): void {
    this.auth.lock();
    this.router.navigate(['/']);
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const surveys = await this.api.getSurveys();
      const survey =
        surveys.find((item) => item.slug === environment.surveySlug) ?? surveys[0] ?? null;

      if (!survey) {
        this.error.set('لا توجد فورم تقييم على السيرفر.');
        return;
      }

      this.surveyId.set(survey.id);
      this.surveyTitle.set(survey.title);

      const details = await this.api.getSurvey(survey.id);
      this.applyDetails(details);

      await Promise.all([this.loadAnalytics(survey.id), this.loadResponses(survey.id)]);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private applyDetails(details: SurveyDetails): void {
    this.details.set(details);
    this.surveyId.set(details.id);
    this.surveyTitle.set(details.title);
    this.questions.set([...details.questions].sort((a, b) => a.order - b.order));
  }

  private async reloadResponses(): Promise<void> {
    try {
      await this.loadResponses();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async loadAnalytics(id = this.surveyId()): Promise<void> {
    if (!id) return;
    const analytics = await this.api.getAnalytics(id);
    this.analytics.set(analytics);
    const firstBreakdown = analytics.choiceBreakdowns[0]?.questionId ?? null;
    this.selectedBreakdownId.set(firstBreakdown);
  }

  private async loadResponses(id = this.surveyId()): Promise<void> {
    if (!id) return;
    const result = await this.api.getResponses(id, {
      search: this.search(),
      stars: this.starFilter() || undefined,
      page: 1,
      pageSize: 100,
    });
    this.rows.set(result.items);
    this.filteredTotal.set(result.total);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}

function shortenLabel(value: string, max = 24): string {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
