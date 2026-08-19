import { Service, computed, effect, signal } from '@angular/core';
import {
  ChoiceId,
  Customer,
  FeedbackEntry,
  PRICE_OPTIONS,
  RECOMMEND_OPTIONS,
  STAR_QUESTIONS,
  choiceLabel,
} from './models';

const STORAGE_KEY = 'bubblecore.feedback.v2';

@Service()
export class FeedbackStore {
  private readonly entriesSignal = signal<FeedbackEntry[]>(this.load());

  /** Customer captured on the welcome screen, carried into the feedback form. */
  readonly customer = signal<Customer | null>(null);

  readonly entries = computed(() =>
    [...this.entriesSignal()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  readonly total = computed(() => this.entriesSignal().length);

  readonly averageRating = computed(() => {
    const list = this.entriesSignal();
    if (!list.length) return 0;
    return list.reduce((sum, entry) => sum + entry.rating, 0) / list.length;
  });

  /** Share of 4–5 star reviews, in percent. */
  readonly satisfactionRate = computed(() => {
    const list = this.entriesSignal();
    if (!list.length) return 0;
    return (list.filter((entry) => entry.rating >= 4).length / list.length) * 100;
  });

  readonly withSuggestions = computed(
    () => this.entriesSignal().filter((entry) => entry.suggestion.trim().length > 0).length,
  );

  /** % who answered "نعم" to recommending Bubble Hop. */
  readonly recommendRate = computed(() => {
    const list = this.entriesSignal();
    if (!list.length) return 0;
    return (list.filter((entry) => entry.recommend === 'yes').length / list.length) * 100;
  });

  /** % who felt the price matches the quality (نعم). */
  readonly priceFairRate = computed(() => {
    const list = this.entriesSignal();
    if (!list.length) return 0;
    return (list.filter((entry) => entry.priceValue === 'yes').length / list.length) * 100;
  });

  /** Average per-question star score across all reviews. */
  readonly questionAverages = computed(() => {
    const list = this.entriesSignal();
    return STAR_QUESTIONS.map((question) => {
      const scores = list
        .map((entry) => entry.ratings[question.id])
        .filter((value): value is number => typeof value === 'number' && value > 0);
      const average = scores.length
        ? scores.reduce((sum, value) => sum + value, 0) / scores.length
        : 0;
      return { id: question.id, label: question.label, icon: question.icon, average };
    });
  });

  /** Star counts from 5 down to 1, with the share of the total for each bar. */
  readonly distribution = computed(() => {
    const list = this.entriesSignal();
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = list.filter((entry) => entry.rating === stars).length;
      return { stars, count, percent: list.length ? (count / list.length) * 100 : 0 };
    });
  });

  readonly recommendBreakdown = computed(() => this.breakdown('recommend', RECOMMEND_OPTIONS));
  readonly priceBreakdown = computed(() => this.breakdown('priceValue', PRICE_OPTIONS));

  constructor() {
    effect(() => this.persist(this.entriesSignal()));
  }

  add(entry: Omit<FeedbackEntry, 'id' | 'createdAt'>): FeedbackEntry {
    const created: FeedbackEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entriesSignal.update((list) => [created, ...list]);
    return created;
  }

  remove(id: string): void {
    this.entriesSignal.update((list) => list.filter((entry) => entry.id !== id));
  }

  clear(): void {
    this.entriesSignal.set([]);
  }

  /** Computes the overall 1–5 score as the rounded mean of answered star questions. */
  static overallOf(ratings: Record<string, number>): number {
    const scores = Object.values(ratings).filter((value) => value > 0);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  }

  toCsv(): string {
    const header = [
      'الاسم',
      'رقم الموبايل',
      'المشروب',
      'الديزرت',
      'سرعة التنفيذ',
      'التقييم العام',
      'السعر مناسب؟',
      'يرشّح بابل هوب؟',
      'الاقتراح',
      'التاريخ',
    ];
    const rows = this.entries().map((entry) => [
      entry.name,
      entry.phone,
      String(entry.ratings['drink'] ?? 0),
      String(entry.ratings['dessert'] ?? 0),
      String(entry.ratings['speed'] ?? 0),
      String(entry.rating),
      choiceLabel(PRICE_OPTIONS, entry.priceValue),
      choiceLabel(RECOMMEND_OPTIONS, entry.recommend),
      entry.suggestion.replace(/\s+/g, ' ').trim(),
      new Date(entry.createdAt).toLocaleString('ar-EG'),
    ]);

    return [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
  }

  /** Fills the dashboard with plausible sample rows for demos and empty states. */
  seedDemo(): void {
    const samples: Array<Omit<FeedbackEntry, 'id' | 'createdAt' | 'rating'>> = [
      {
        name: 'أحمد المصري',
        phone: '01012345678',
        ratings: { drink: 5, dessert: 5, speed: 4 },
        priceValue: 'yes',
        recommend: 'yes',
        suggestion: 'المشروب رهيب والطاقم محترم، أكيد هرجع تاني.',
      },
      {
        name: 'سارة عبد الله',
        phone: '01198765432',
        ratings: { drink: 4, dessert: 5, speed: 3 },
        priceValue: 'somewhat',
        recommend: 'maybe',
        suggestion: 'الديزرت تحفة بس الطلب اتأخر شوية.',
      },
      {
        name: 'محمود خليل',
        phone: '01234567890',
        ratings: { drink: 3, dessert: 3, speed: 2 },
        priceValue: 'no',
        recommend: 'no',
        suggestion: 'السعر حاسس إنه أعلى من الجودة شوية.',
      },
      {
        name: 'نور حسن',
        phone: '01555443322',
        ratings: { drink: 5, dessert: 4, speed: 5 },
        priceValue: 'yes',
        recommend: 'yes',
        suggestion: '',
      },
      {
        name: 'يوسف عادل',
        phone: '01099887766',
        ratings: { drink: 2, dessert: 3, speed: 2 },
        priceValue: 'somewhat',
        recommend: 'maybe',
        suggestion: 'سرعة التنفيذ محتاجة تتحسن في وقت الزحمة.',
      },
    ];

    const now = Date.now();
    const seeded: FeedbackEntry[] = samples.map((sample, index) => ({
      ...sample,
      rating: FeedbackStore.overallOf(sample.ratings),
      id: crypto.randomUUID(),
      createdAt: new Date(now - index * 5 * 3600_000).toISOString(),
    }));

    this.entriesSignal.update((list) => [...seeded, ...list]);
  }

  private breakdown(
    key: 'recommend' | 'priceValue',
    options: readonly { id: ChoiceId; label: string; tone: string }[],
  ) {
    const list = this.entriesSignal();
    return options.map((option) => {
      const count = list.filter((entry) => entry[key] === option.id).length;
      return {
        id: option.id,
        label: option.label,
        tone: option.tone,
        count,
        percent: list.length ? (count / list.length) * 100 : 0,
      };
    });
  }

  private load(): FeedbackEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
    } catch {
      return [];
    }
  }

  private persist(entries: FeedbackEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage unavailable (private mode / quota) — keep the in-memory state.
    }
  }
}
