import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  ChoiceBreakdown,
  DiscountCodeRow,
  DiscountCodeStatusValue,
  Kpi,
  QuestionDetails,
  ResponseAnswer,
  SaveSurvey,
  SurveyAnalytics,
  SurveyDetails,
  SurveyResponseRow,
} from '../../core/api-models';
import { AdminAuth } from '../../core/admin-auth';
import { discountCodeMobile, discountCodeStatus } from '../../core/discount-code-status';
import { FeedbackStore } from '../../core/feedback-store';
import { ChoiceOption, displayIcon, optionTone } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { AdminSurveyEditorComponent } from '../admin-survey-editor/admin-survey-editor';
import { ModernSelectComponent } from '../../shared/modern-select/modern-select';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

type InsightTab = 'distribution' | 'averages' | 'choices';
type DashboardView = 'dashboard' | 'editor' | 'discounts';

const DISCOUNT_STATUS_OPTIONS: readonly ChoiceOption[] = [
  { id: '1', label: 'فعّال', icon: '●', tone: 'positive' },
  { id: '2', label: 'مستخدم', icon: '●', tone: 'neutral' },
  { id: '3', label: 'منتهي', icon: '●', tone: 'negative' },
  { id: '4', label: 'ملغي', icon: '●', tone: 'neutral' },
];

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    StarRatingComponent,
    DecimalPipe,
    DatePipe,
    AdminSurveyEditorComponent,
    ModernSelectComponent,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  private readonly api = inject(SurveyApi);
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackStore);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private discountSearchTimer: ReturnType<typeof setTimeout> | undefined;

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
  protected readonly page = signal(1);
  protected readonly pageSize = 10;
  protected readonly responsesLoading = signal(false);
  protected readonly view = signal<DashboardView>('dashboard');
  protected readonly discountSearch = signal('');
  protected readonly discountRows = signal<DiscountCodeRow[]>([]);
  protected readonly discountTotal = signal(0);
  protected readonly discountPage = signal(1);
  protected readonly discountPageSize = 10;
  protected readonly discountLoading = signal(false);
  protected readonly discountExporting = signal(false);
  protected readonly updatingCodeId = signal<number | null>(null);

  protected readonly mobileOf = discountCodeMobile;
  protected readonly statusOf = discountCodeStatus;
  protected readonly discountStatusOptions = DISCOUNT_STATUS_OPTIONS;

  protected readonly search = signal('');
  protected readonly starFilter = signal(0);
  protected readonly starOptions = [0, 5, 4, 3, 2, 1];

  /** Which response card/row has its answers expanded. */
  protected readonly expandedId = signal<number | null>(null);
  protected readonly insightTab = signal<InsightTab>('distribution');
  protected readonly selectedBreakdownId = signal<number | null>(null);

  protected readonly total = computed(() => this.analytics()?.totalResponses ?? 0);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTotal() / this.pageSize)),
  );
  protected readonly pageStart = computed(() => {
    if (!this.filteredTotal()) return 0;
    return (this.page() - 1) * this.pageSize + 1;
  });
  protected readonly pageEnd = computed(() =>
    Math.min(this.page() * this.pageSize, this.filteredTotal()),
  );
  protected readonly canPrevPage = computed(() => this.page() > 1);
  protected readonly canNextPage = computed(() => this.page() < this.totalPages());

  protected readonly discountTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.discountTotal() / this.discountPageSize)),
  );
  protected readonly canPrevDiscountPage = computed(() => this.discountPage() > 1);
  protected readonly canNextDiscountPage = computed(
    () => this.discountPage() < this.discountTotalPages(),
  );
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
    this.page.set(1);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.reloadResponses(), 300);
  }

  protected setStarFilter(stars: number): void {
    this.starFilter.set(stars);
    this.page.set(1);
    void this.reloadResponses();
  }

  protected goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    if (next === this.page()) return;
    this.page.set(next);
    this.expandedId.set(null);
    void this.reloadResponses().then(() => {
      document.getElementById('responses-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  protected prevPage(): void {
    this.goToPage(this.page() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.page() + 1);
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

  /** Notes from the response payload, or from any text answer attached to the evaluation. */
  protected rowNotes(row: SurveyResponseRow): string {
    const direct =
      row.notes?.trim() ||
      row.comment?.trim() ||
      row.suggestion?.trim() ||
      row.feedback?.trim();
    if (direct) return direct;

    const textAnswers = row.answers
      .filter((item) => {
        if (!item.textValue?.trim()) return false;
        const type = String(item.questionType ?? '').toLowerCase();
        // API may send "Text", "text", or numeric enum 4.
        return type === 'text' || type === '4' || type === '';
      })
      .map((item) => item.textValue!.trim());

    if (textAnswers.length) return textAnswers.join('\n');

    // Last resort: any answer that only carries free text.
    const freeText = row.answers.find(
      (item) =>
        !!item.textValue?.trim() &&
        item.ratingValue == null &&
        item.numberValue == null &&
        item.selectedOptionId == null &&
        !(item.selectedOptionTexts?.length),
    );
    return freeText?.textValue?.trim() ?? '';
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

  /** Score/choice questions only — notes are shown in their own block. */
  protected detailQuestions(): QuestionDetails[] {
    return this.questions().filter((question) => question.type !== 'Text');
  }

  protected openEditor(): void {
    this.view.set('editor');
  }

  protected closeEditor(): void {
    this.view.set('dashboard');
  }

  protected openDiscounts(): void {
    this.view.set('discounts');
    this.discountPage.set(1);
    void this.loadDiscountCodes();
  }

  protected closeDiscounts(): void {
    this.view.set('dashboard');
  }

  protected onDiscountSearch(event: Event): void {
    this.discountSearch.set((event.target as HTMLInputElement).value);
    this.discountPage.set(1);
    clearTimeout(this.discountSearchTimer);
    this.discountSearchTimer = setTimeout(() => void this.loadDiscountCodes(), 300);
  }

  protected prevDiscountPage(): void {
    if (!this.canPrevDiscountPage()) return;
    this.discountPage.update((value) => value - 1);
    void this.loadDiscountCodes();
  }

  protected nextDiscountPage(): void {
    if (!this.canNextDiscountPage()) return;
    this.discountPage.update((value) => value + 1);
    void this.loadDiscountCodes();
  }

  protected onDiscountStatusChange(row: DiscountCodeRow, value: string | null): void {
    if (!value || this.updatingCodeId() === row.id) return;
    const status = Number(value) as DiscountCodeStatusValue;
    if (![1, 2, 3, 4].includes(status) || status === this.statusSelectValue(row.status)) return;
    void this.setDiscountStatus(row, status);
  }

  protected async setDiscountStatus(
    row: DiscountCodeRow,
    status: DiscountCodeStatusValue,
  ): Promise<void> {
    const surveyId = this.surveyId();
    if (!surveyId || this.updatingCodeId()) return;
    this.updatingCodeId.set(row.id);
    try {
      const updated = await this.api.updateDiscountCode(surveyId, row.id, { status });
      this.discountRows.update((rows) =>
        rows.map((entry) => (entry.id === row.id ? updated : entry)),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.updatingCodeId.set(null);
    }
  }

  protected statusSelectValue(status: DiscountCodeRow['status']): DiscountCodeStatusValue {
    const meta = this.statusOf(status).tone;
    if (meta === 'used') return 2;
    if (meta === 'expired') return 3;
    if (meta === 'revoked') return 4;
    return 1;
  }

  protected statusSelectId(status: DiscountCodeRow['status']): string {
    return String(this.statusSelectValue(status));
  }

  protected async exportDiscountExcel(): Promise<void> {
    const surveyId = this.surveyId();
    if (!surveyId || this.discountExporting()) return;
    this.discountExporting.set(true);
    try {
      const result = await this.api.searchDiscountCodes(surveyId, {
        search: this.discountSearch(),
        page: 1,
        pageSize: Math.max(this.discountTotal() || 1000, 1000),
      });
      const rows = result.items;
      const header = ['mobile', 'name', 'code', 'percent', 'status', 'issuedAt', 'expiresAt'];
      const lines = [
        header.join(','),
        ...rows.map((row) =>
          [
            csvCell(this.mobileOf(row)),
            csvCell(row.customerName ?? ''),
            csvCell(row.code),
            csvCell(row.discountPercent ?? ''),
            csvCell(this.statusOf(row.status).label),
            csvCell(row.issuedAt ?? ''),
            csvCell(row.expiresAt ?? ''),
          ].join(','),
        ),
      ];
      const blob = new Blob(['\uFEFF' + lines.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bubble-hope-discount-codes.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.discountExporting.set(false);
    }
  }

  private async loadDiscountCodes(): Promise<void> {
    const surveyId = this.surveyId();
    if (!surveyId) return;
    this.discountLoading.set(true);
    try {
      const result = await this.api.searchDiscountCodes(surveyId, {
        search: this.discountSearch(),
        page: this.discountPage(),
        pageSize: this.discountPageSize,
      });

      const maxPage = Math.max(1, Math.ceil(result.total / this.discountPageSize));
      if (this.discountPage() > maxPage && result.total > 0) {
        this.discountPage.set(maxPage);
        const corrected = await this.api.searchDiscountCodes(surveyId, {
          search: this.discountSearch(),
          page: maxPage,
          pageSize: this.discountPageSize,
        });
        this.discountRows.set(corrected.items);
        this.discountTotal.set(corrected.total);
        return;
      }

      this.discountRows.set(result.items);
      this.discountTotal.set(result.total);
    } catch (error) {
      this.discountRows.set([]);
      this.discountTotal.set(0);
      this.error.set(errorMessage(error));
    } finally {
      this.discountLoading.set(false);
    }
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
      const ensured = await this.ensureNotesQuestion(details);
      this.applyDetails(ensured);

      await Promise.all([this.loadAnalytics(survey.id), this.loadResponses(survey.id)]);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Notes are submitted as a Text answer. If the survey has no Text question,
   * past notes were dropped by the API — provision one so new submissions persist.
   */
  private async ensureNotesQuestion(details: SurveyDetails): Promise<SurveyDetails> {
    const hasText = details.questions.some((question) => {
      const type = String(question.type);
      return type === 'Text' || type === '4';
    });
    if (hasText) return details;

    const saved = await this.api.updateSurvey(details.id, toSaveSurveyWithNotes(details));
    this.feedback.survey.set(null);
    return saved;
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
    this.responsesLoading.set(true);
    try {
      let page = this.page();
      const result = await this.api.getResponses(id, {
        search: this.search(),
        stars: this.starFilter() || undefined,
        page,
        pageSize: this.pageSize,
      });

      const maxPage = Math.max(1, Math.ceil(result.total / this.pageSize));
      if (page > maxPage && result.total > 0) {
        this.page.set(maxPage);
        const corrected = await this.api.getResponses(id, {
          search: this.search(),
          stars: this.starFilter() || undefined,
          page: maxPage,
          pageSize: this.pageSize,
        });
        this.rows.set(corrected.items);
        this.filteredTotal.set(corrected.total);
        return;
      }

      this.rows.set(result.items);
      this.filteredTotal.set(result.total);
    } finally {
      this.responsesLoading.set(false);
    }
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

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toSaveSurveyWithNotes(details: SurveyDetails): SaveSurvey {
  const existing = [...details.questions]
    .sort((a, b) => a.order - b.order)
    .map((question, index) => ({
      id: question.id,
      key: question.key || `question_${question.id}`,
      title: question.title,
      subtitle: question.subtitle,
      type: question.type,
      isRequired: question.isRequired,
      icon: question.icon,
      order: index + 1,
      minValue: question.minValue,
      maxValue: question.maxValue,
      maxLength: question.maxLength,
      options: [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((option, optionIndex) => ({
          id: option.id,
          text: option.text,
          value: option.value,
          icon: option.icon,
          order: optionIndex + 1,
        })),
    }));

  return {
    title: details.title,
    description: details.description,
    slug: details.slug,
    discount: details.discount ?? {
      enabled: false,
      percent: 5,
      codePrefix: 'BH-',
      validityDays: 30,
    },
    branches: [...details.branches]
      .sort((a, b) => a.order - b.order)
      .map((branch, index) => ({
        id: branch.id,
        name: branch.name,
        order: index + 1,
        isActive: branch.isActive,
      })),
    questions: [
      ...existing,
      {
        key: 'customer_notes',
        title: 'لو حابب تكتب ملاحظة أو اقتراح',
        subtitle: 'تقرير / ملاحظات العميل',
        type: 'Text',
        isRequired: false,
        icon: null,
        order: existing.length + 1,
        minValue: null,
        maxValue: null,
        maxLength: 500,
        options: [],
      },
    ],
  };
}
