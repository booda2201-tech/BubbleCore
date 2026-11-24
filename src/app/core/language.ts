import { Service, computed, signal } from '@angular/core';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'bubblecore.language';

@Service()
export class LanguageService {
  private readonly languageSignal = signal<AppLanguage | null>(this.readStored());

  readonly language = this.languageSignal.asReadonly();
  readonly isRtl = computed(() => (this.languageSignal() ?? 'ar') === 'ar');
  readonly hasSelection = computed(() => this.languageSignal() !== null);

  constructor() {
    this.apply(this.languageSignal() ?? 'ar');
  }

  select(language: AppLanguage): void {
    this.languageSignal.set(language);
    this.persist(language);
    this.apply(language);
  }

  /** Current language, defaulting to Arabic until the user picks one. */
  current(): AppLanguage {
    return this.languageSignal() ?? 'ar';
  }

  private apply(language: AppLanguage): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.dataset['lang'] = language;
  }

  private readStored(): AppLanguage | null {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'ar' || value === 'en' ? value : null;
  }

  private persist(language: AppLanguage): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, language);
  }
}
