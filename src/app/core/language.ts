import { Service, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'bubblecore.language';

/** Staff screens are Arabic-only — never follow the customer's language choice. */
const STAFF_PATH = /^\/(admin|cashier)(\/|\?|#|$)/;

@Service()
export class LanguageService {
  private readonly router = inject(Router);
  private readonly languageSignal = signal<AppLanguage | null>(this.readStored());

  readonly language = this.languageSignal.asReadonly();
  readonly isRtl = computed(() => (this.languageSignal() ?? 'ar') === 'ar');
  readonly hasSelection = computed(() => this.languageSignal() !== null);

  constructor() {
    this.apply(this.languageSignal() ?? 'ar');

    // Re-apply on every navigation so /admin and /cashier stay Arabic + RTL,
    // and the customer's stored language comes back on public screens.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.syncWithRoute(event.urlAfterRedirects);
    });
  }

  select(language: AppLanguage): void {
    this.languageSignal.set(language);
    this.persist(language);
    this.syncWithRoute(this.router.url);
  }

  /** Current language, defaulting to Arabic until the user picks one. */
  current(): AppLanguage {
    return this.languageSignal() ?? 'ar';
  }

  private syncWithRoute(url: string): void {
    this.apply(STAFF_PATH.test(url) ? 'ar' : this.current());
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
