import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  QuestionType,
  SaveOption,
  SaveQuestion,
  SaveSurvey,
  SurveyDetails,
} from '../../core/api-models';
import { displayIcon } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';

interface EditorOption {
  localId: string;
  id: number | null;
  text: string;
  value: string;
  icon: string;
}

interface EditorQuestion {
  localId: string;
  id: number | null;
  key: string;
  title: string;
  subtitle: string;
  type: QuestionType;
  isRequired: boolean;
  icon: string;
  minValue: number | null;
  maxValue: number | null;
  maxLength: number | null;
  options: EditorOption[];
}

interface EditorBranch {
  localId: string;
  id: number | null;
  name: string;
  isActive: boolean;
}

interface EditorDraft {
  title: string;
  description: string;
  slug: string;
  branches: EditorBranch[];
  questions: EditorQuestion[];
}

const QUESTION_TYPES: readonly { id: QuestionType; label: string }[] = [
  { id: 'Rating', label: 'تقييم بالنجوم' },
  { id: 'SingleChoice', label: 'اختيار واحد' },
  { id: 'MultipleChoice', label: 'اختيارات متعددة' },
  { id: 'YesNo', label: 'نعم / لا' },
  { id: 'Text', label: 'نص مفتوح' },
  { id: 'Number', label: 'رقم' },
];

@Component({
  selector: 'app-admin-survey-editor',
  imports: [FormsModule],
  templateUrl: './admin-survey-editor.html',
  styleUrl: './admin-survey-editor.scss',
})
export class AdminSurveyEditorComponent {
  private readonly api = inject(SurveyApi);

  readonly survey = input.required<SurveyDetails>();
  readonly saved = output<SurveyDetails>();
  readonly cancelled = output<void>();

  protected readonly types = QUESTION_TYPES;
  protected readonly draft = signal<EditorDraft | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');

  constructor() {
    effect(() => {
      const survey = this.survey();
      untracked(() => {
        if (!this.draft()) this.draft.set(toDraft(survey));
      });
    });
  }

  protected iconPreview(icon: string): string {
    return displayIcon(icon);
  }

  protected needsOptions(type: QuestionType): boolean {
    return needsOptions(type);
  }

  protected onTitle(event: Event): void {
    this.patchDraft({ title: inputValue(event) });
  }

  protected onDescription(event: Event): void {
    this.patchDraft({ description: inputValue(event) });
  }

  protected onBranchName(localId: string, event: Event): void {
    this.updateBranch(localId, { name: inputValue(event) });
  }

  protected addBranch(): void {
    this.patchDraft({
      branches: [
        ...this.draftOrThrow().branches,
        { localId: uid(), id: null, name: '', isActive: true },
      ],
    });
  }

  protected removeBranch(localId: string): void {
    this.patchDraft({
      branches: this.draftOrThrow().branches.filter((branch) => branch.localId !== localId),
    });
  }

  protected addQuestion(): void {
    const questions = this.draftOrThrow().questions;
    const created = emptyQuestion(uniqueKey(questions));
    this.patchDraft({ questions: [...questions, created] });
    queueMicrotask(() => {
      document
        .getElementById(`editor-question-${created.localId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  protected removeQuestion(localId: string): void {
    this.patchDraft({
      questions: this.draftOrThrow().questions.filter((question) => question.localId !== localId),
    });
  }

  protected moveQuestion(index: number, direction: -1 | 1): void {
    const questions = [...this.draftOrThrow().questions];
    const next = index + direction;
    if (next < 0 || next >= questions.length) return;
    [questions[index], questions[next]] = [questions[next], questions[index]];
    this.patchDraft({ questions });
  }

  protected onQuestionField(
    localId: string,
    field: 'title' | 'subtitle' | 'key' | 'icon',
    event: Event,
  ): void {
    const value = field === 'key' ? normalizeKey(inputValue(event)) : inputValue(event);
    this.updateQuestion(localId, { [field]: value });
  }

  protected onQuestionNumber(
    localId: string,
    field: 'minValue' | 'maxValue' | 'maxLength',
    event: Event,
  ): void {
    const raw = inputValue(event);
    this.updateQuestion(localId, { [field]: raw === '' ? null : Number(raw) });
  }

  protected onRequired(localId: string, event: Event): void {
    this.updateQuestion(localId, {
      isRequired: (event.target as HTMLInputElement).checked,
    });
  }

  protected setType(localId: string, type: QuestionType): void {
    const question = this.draftOrThrow().questions.find((item) => item.localId === localId);
    if (!question || question.type === type) return;

    let options = question.options;
    if (needsOptions(type) && options.length < 2) {
      options = type === 'YesNo' ? yesNoOptions() : [emptyOption(), emptyOption()];
    }

    this.updateQuestion(localId, {
      type,
      options,
      minValue: type === 'Rating' ? (question.minValue ?? 1) : question.minValue,
      maxValue: type === 'Rating' ? (question.maxValue ?? 5) : question.maxValue,
      maxLength: type === 'Text' ? (question.maxLength ?? 500) : question.maxLength,
    });
  }

  protected addOption(questionId: string): void {
    const question = this.draftOrThrow().questions.find((item) => item.localId === questionId);
    if (!question) return;
    this.updateQuestion(questionId, { options: [...question.options, emptyOption()] });
  }

  protected removeOption(questionId: string, optionId: string): void {
    const question = this.draftOrThrow().questions.find((item) => item.localId === questionId);
    if (!question) return;
    this.updateQuestion(questionId, {
      options: question.options.filter((option) => option.localId !== optionId),
    });
  }

  protected moveOption(questionId: string, index: number, direction: -1 | 1): void {
    const question = this.draftOrThrow().questions.find((item) => item.localId === questionId);
    if (!question) return;
    const options = [...question.options];
    const next = index + direction;
    if (next < 0 || next >= options.length) return;
    [options[index], options[next]] = [options[next], options[index]];
    this.updateQuestion(questionId, { options });
  }

  protected onOptionField(
    questionId: string,
    optionId: string,
    field: 'text' | 'value' | 'icon',
    event: Event,
  ): void {
    const question = this.draftOrThrow().questions.find((item) => item.localId === questionId);
    if (!question) return;
    this.updateQuestion(questionId, {
      options: question.options.map((option) =>
        option.localId === optionId ? { ...option, [field]: inputValue(event) } : option,
      ),
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected async save(): Promise<void> {
    const draft = this.draftOrThrow();
    const validation = validateDraft(draft);
    if (validation) {
      this.error.set(validation);
      this.success.set('');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    try {
      const saved = await this.api.updateSurvey(this.survey().id, toPayload(draft));
      this.draft.set(toDraft(saved));
      this.success.set('تم الحفظ. الفورم العامة هتعرض الأسئلة الجديدة فورًا.');
      this.saved.emit(saved);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private draftOrThrow(): EditorDraft {
    const draft = this.draft();
    if (!draft) throw new Error('Editor draft is not ready.');
    return draft;
  }

  private patchDraft(partial: Partial<EditorDraft>): void {
    this.success.set('');
    this.draft.update((current) => (current ? { ...current, ...partial } : current));
  }

  private updateQuestion(localId: string, partial: Partial<EditorQuestion>): void {
    this.patchDraft({
      questions: this.draftOrThrow().questions.map((question) =>
        question.localId === localId ? { ...question, ...partial } : question,
      ),
    });
  }

  private updateBranch(localId: string, partial: Partial<EditorBranch>): void {
    this.patchDraft({
      branches: this.draftOrThrow().branches.map((branch) =>
        branch.localId === localId ? { ...branch, ...partial } : branch,
      ),
    });
  }
}

function needsOptions(type: QuestionType): boolean {
  return type === 'SingleChoice' || type === 'MultipleChoice' || type === 'YesNo';
}

function normalizeType(value: unknown): QuestionType {
  const byNumber: Record<number, QuestionType> = {
    1: 'Rating',
    2: 'SingleChoice',
    3: 'MultipleChoice',
    4: 'Text',
    5: 'YesNo',
    6: 'Number',
  };

  if (typeof value === 'number') return byNumber[value] ?? 'Rating';

  const raw = String(value ?? '');
  const match = QUESTION_TYPES.find((item) => item.id.toLowerCase() === raw.toLowerCase());
  return match?.id ?? 'Rating';
}

function toDraft(survey: SurveyDetails): EditorDraft {
  return {
    title: survey.title,
    description: survey.description ?? '',
    slug: survey.slug,
    branches: (survey.branches ?? []).map((branch) => ({
      localId: uid(),
      id: branch.id,
      name: branch.name,
      isActive: branch.isActive,
    })),
    questions: [...survey.questions]
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        localId: uid(),
        id: question.id,
        key: question.key ?? '',
        title: question.title,
        subtitle: question.subtitle ?? '',
        type: normalizeType(question.type),
        isRequired: question.isRequired,
        icon: question.icon ?? '',
        minValue: question.minValue,
        maxValue: question.maxValue,
        maxLength: question.maxLength,
        options: [...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            localId: uid(),
            id: option.id,
            text: option.text,
            value: option.value ?? '',
            icon: option.icon ?? '',
          })),
      })),
  };
}

function toPayload(draft: EditorDraft): SaveSurvey {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    slug: draft.slug,
    branches: draft.branches
      .filter((branch) => branch.name.trim().length > 0)
      .map((branch, index) => ({
        ...(branch.id && branch.id > 0 ? { id: branch.id } : {}),
        name: branch.name.trim(),
        order: index + 1,
        isActive: branch.isActive,
      })),
    questions: draft.questions.map((question, index) => toQuestionPayload(question, index)),
  };
}

function toQuestionPayload(question: EditorQuestion, index: number): SaveQuestion {
  const options: SaveOption[] = needsOptions(question.type)
    ? question.options
        .filter((option) => option.text.trim())
        .map((option, optionIndex) => ({
          ...(option.id && option.id > 0 ? { id: option.id } : {}),
          text: option.text.trim(),
          value: option.value.trim() || null,
          icon: option.icon.trim() || null,
          order: optionIndex + 1,
        }))
    : [];

  return {
    ...(question.id && question.id > 0 ? { id: question.id } : {}),
    key: question.key.trim(),
    title: question.title.trim(),
    subtitle: question.subtitle.trim() || null,
    type: question.type,
    isRequired: question.isRequired,
    icon: question.icon.trim() || null,
    order: index + 1,
    minValue: question.minValue,
    maxValue: question.maxValue,
    maxLength: question.maxLength,
    options,
  };
}

function validateDraft(draft: EditorDraft): string | null {
  if (!draft.title.trim()) return 'عنوان الفورم مطلوب.';
  if (!draft.questions.length) return 'أضيفي سؤال واحد على الأقل.';

  for (const question of draft.questions) {
    if (!question.title.trim()) return 'كل سؤال محتاج عنوان.';
    if (!question.key.trim()) {
      return `السؤال "${question.title.trim() || 'بدون عنوان'}" محتاج Key.`;
    }
    if (needsOptions(question.type)) {
      const filled = question.options.filter((option) => option.text.trim());
      if (filled.length < 2) {
        return `السؤال "${question.title.trim() || 'بدون عنوان'}" محتاج اختيارين على الأقل.`;
      }
    }
  }

  const keys = draft.questions.map((question) => question.key.trim().toLowerCase());
  if (new Set(keys).size !== keys.length) return 'الـ Key بتاع كل سؤال لازم يكون فريد.';

  return null;
}

function emptyQuestion(key = ''): EditorQuestion {
  return {
    localId: uid(),
    id: null,
    key,
    title: '',
    subtitle: '',
    type: 'Rating',
    isRequired: true,
    icon: '',
    minValue: 1,
    maxValue: 5,
    maxLength: null,
    options: [],
  };
}

function uniqueKey(questions: EditorQuestion[]): string {
  const used = new Set(questions.map((question) => question.key.trim().toLowerCase()).filter(Boolean));
  let index = questions.length + 1;
  let candidate = `question_${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `question_${index}`;
  }
  return candidate;
}

function emptyOption(): EditorOption {
  return { localId: uid(), id: null, text: '', value: '', icon: '' };
}

function yesNoOptions(): EditorOption[] {
  return [
    { localId: uid(), id: null, text: 'نعم', value: 'yes', icon: 'check' },
    { localId: uid(), id: null, text: 'لا', value: 'no', icon: 'x' },
  ];
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

function normalizeKey(value: string): string {
  return value
    .trimStart()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

function uid(): string {
  return crypto.randomUUID();
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
