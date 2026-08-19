export interface Customer {
  name: string;
  phone: string;
  branchId: number | null;
}

export type ChoiceId = string;

export type ChoiceTone = 'positive' | 'neutral' | 'negative';

export interface ChoiceOption {
  id: ChoiceId;
  label: string;
  icon: string;
  /** Sentiment used for colouring chips and option buttons. */
  tone: ChoiceTone;
}

export const RATING_LABELS: readonly string[] = [
  'لم يتم التقييم',
  'سيئ جداً',
  'يحتاج تحسين',
  'مقبول',
  'جيد جداً',
  'ممتاز',
];

const ICON_MAP: Record<string, string> = {
  drink: '🥤',
  dessert: '🍰',
  bolt: '⚡',
  check: '✔',
  wave: '≈',
  x: '✕',
  heart: '❤',
  maybe: '↺',
};

export function displayIcon(icon?: string | null): string {
  if (!icon) return '';
  return ICON_MAP[icon] ?? icon;
}

export function optionTone(value?: string | null): ChoiceTone {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'yes') return 'positive';
  if (normalized === 'no') return 'negative';
  return 'neutral';
}

export function choiceLabel(options: readonly ChoiceOption[], id: ChoiceId | null): string {
  if (!id) return '—';
  return options.find((option) => option.id === id)?.label ?? id;
}
