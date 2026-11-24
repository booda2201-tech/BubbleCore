import { Service, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthUser, AuthUserSurvey, LoginResponse } from './api-models';

const TOKEN_KEY = 'bubblecore.admin.token';
const USER_KEY = 'bubblecore.admin.user';

const KNOWN_SLUGS = [environment.surveySlug, environment.expoSurveySlug] as const;

@Service()
export class AdminAuth {
  private readonly tokenState = signal<string | null>(this.readToken());
  private readonly userState = signal<AuthUser | null>(this.readUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isUnlocked = computed(() => !!this.tokenState());

  setSession(session: LoginResponse): void {
    this.tokenState.set(session.token);
    this.userState.set(session.user);
    this.persist(session.token, session.user);
  }

  /** Prefer an explicit slug, else the best staff assignment on this account. */
  hasSurveyAccess(slug?: string): boolean {
    return !!this.surveyAccess(slug);
  }

  surveyAccess(slug?: string): AuthUserSurvey | null {
    const surveys = this.userState()?.surveys ?? [];
    if (!surveys.length) return null;

    if (slug) {
      return surveys.find((survey) => survey.slug === slug) ?? null;
    }

    return this.resolveStaffSurvey(surveys);
  }

  isAdmin(slug?: string): boolean {
    return normalizeRole(this.surveyAccess(slug)?.role) === 'admin';
  }

  isCashier(slug?: string): boolean {
    return normalizeRole(this.surveyAccess(slug)?.role) === 'cashier';
  }

  homeRoute(preferredSlug?: string): string {
    const access = preferredSlug
      ? this.surveyAccess(preferredSlug) ?? this.surveyAccess()
      : this.surveyAccess();
    const role = normalizeRole(access?.role);
    if (role === 'admin') return '/admin';
    if (role === 'cashier') return '/cashier';
    return '/';
  }

  lock(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.persist(null, null);
  }

  private resolveStaffSurvey(surveys: AuthUserSurvey[]): AuthUserSurvey | null {
    const staff = surveys.filter((survey) => isStaffRole(survey.role));
    if (!staff.length) return null;

    for (const slug of KNOWN_SLUGS) {
      const hit = staff.find((survey) => survey.slug === slug);
      if (hit) return hit;
    }

    return staff[0] ?? null;
  }

  private persist(token: string | null, user: AuthUser | null): void {
    if (typeof sessionStorage === 'undefined') return;

    if (token && user) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      return;
    }

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  private readToken(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private readUser(): AuthUser | null {
    if (typeof sessionStorage === 'undefined') return null;

    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}

function isStaffRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'cashier';
}

function normalizeRole(role?: string | null): string {
  return (role ?? '').trim().toLowerCase();
}
