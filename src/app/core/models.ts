export interface Customer {
  name: string;
  phone: string;
}

export type ChoiceId = string;

export interface FeedbackEntry {
  id: string;
  name: string;
  phone: string;
  /** Overall experience (1–5), derived from the answered star questions. */
  rating: number;
  /** Per-question star ratings keyed by question id (drink, dessert, speed). */
  ratings: Record<string, number>;
  /** "هل السعر مناسب لجودة المشروب؟" → yes | somewhat | no */
  priceValue: ChoiceId | null;
  /** "هل ترشّح بابل هوب وهتزورنا تاني؟" → yes | maybe | no */
  recommend: ChoiceId | null;
  suggestion: string;
  createdAt: string;
}

export interface StarQuestion {
  id: string;
  label: string;
  hint: string;
  icon: string;
}

export interface ChoiceOption {
  id: ChoiceId;
  label: string;
  icon: string;
  /** Sentiment used for colouring chips in the dashboard. */
  tone: 'positive' | 'neutral' | 'negative';
}

/** Star-rated questions requested by the owner. */
export const STAR_QUESTIONS: readonly StarQuestion[] = [
  {
    id: 'drink',
    label: 'المشروب بتاعك النهارده',
    hint: 'إيه تقييمك للمشروب من ١ ل ٥؟',
    icon: '🥤',
  },
  {
    id: 'dessert',
    label: 'الديزرت',
    hint: 'إيه تقييمك للديزرت من ١ ل ٥؟',
    icon: '🍰',
  },
  {
    id: 'speed',
    label: 'سرعة تنفيذ الطلب',
    hint: 'قد إيه الطلب اتنفّذ بسرعة؟',
    icon: '⚡',
  },
];

/** "حسيت السعر مناسب لجودة المشروب؟" */
export const PRICE_OPTIONS: readonly ChoiceOption[] = [
  { id: 'yes', label: 'نعم', icon: '✔', tone: 'positive' },
  { id: 'somewhat', label: 'إلى حدٍ ما', icon: '≈', tone: 'neutral' },
  { id: 'no', label: 'لا', icon: '✕', tone: 'negative' },
];

/** "هتـرشّح بابل هوب لأصحابك وهتزورنا تاني؟" */
export const RECOMMEND_OPTIONS: readonly ChoiceOption[] = [
  { id: 'yes', label: 'نعم', icon: '❤', tone: 'positive' },
  { id: 'maybe', label: 'ممكن', icon: '↺', tone: 'neutral' },
  { id: 'no', label: 'لا', icon: '✕', tone: 'negative' },
];

export const RATING_LABELS: readonly string[] = [
  'لم يتم التقييم',
  'سيئ جداً',
  'يحتاج تحسين',
  'مقبول',
  'جيد جداً',
  'ممتاز',
];

/** Options for the 1–5 rating dropdowns. */
export const RATING_OPTIONS: readonly ChoiceOption[] = [
  { id: '5', label: '٥ — ممتاز', icon: '★★★★★', tone: 'positive' },
  { id: '4', label: '٤ — جيد جداً', icon: '★★★★', tone: 'positive' },
  { id: '3', label: '٣ — مقبول', icon: '★★★', tone: 'neutral' },
  { id: '2', label: '٢ — يحتاج تحسين', icon: '★★', tone: 'neutral' },
  { id: '1', label: '١ — سيئ جداً', icon: '★', tone: 'negative' },
];

export function choiceLabel(options: readonly ChoiceOption[], id: ChoiceId | null): string {
  if (!id) return '—';
  return options.find((option) => option.id === id)?.label ?? id;
}
