import { Service, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthUser, AuthUserSurvey, LoginResponse } from './api-models';

const TOKEN_KEY = 'bubblecore.admin.token';
const USER_KEY = 'bubblecore.admin.user';
const SURVEY_KEY = 'bubblecore.admin.survey';

const KNOWN_SLUGS = [environment.surveySlug, environment.expoSurveySlug] as const;

@Service()
export class AdminAuth {
  private readonly tokenState = signal<string | null>(this.readToken());
  private readonly userState = signal<AuthUser | null>(this.readUser());
  /** Which survey (store / expo) this staff session is working on. */
  private readonly activeSlugState = signal<string | null>(this.readActiveSlug());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly activeSlug = this.activeSlugState.asReadonly();
  readonly isUnlocked = computed(() => !!this.tokenState());
  readonly isExpoSession = computed(() => this.surveyAccess()?.slug === environment.expoSurveySlug);

  setSession(session: LoginResponse): void {
    this.tokenState.set(session.token);
    this.userState.set(session.user);
    this.activeSlugState.set(null);
    this.persist(session.token, session.user, null);
  }

  /** Pin the session to one survey so /admin and /cashier never mix store & expo. */
  useSurvey(slug: string): boolean {
    const hit = this.staffSurveys().find((survey) => survey.slug === slug);
    if (!hit) return false;
    this.activeSlugState.set(hit.slug);
    this.persistActiveSlug(hit.slug);
    return true;
  }

  hasSurveyAccess(slug?: string): boolean {
    return !!this.surveyAccess(slug);
  }

  /**
   * With a slug → access for exactly that survey.
   * Without → the pinned survey (see useSurvey), else the best staff assignment.
   */
  surveyAccess(slug?: string): AuthUserSurvey | null {
    const surveys = this.userState()?.surveys ?? [];
    if (!surveys.length) return null;

    if (slug) {
      return surveys.find((survey) => survey.slug === slug) ?? null;
    }

    const staff = this.staffSurveys();
    const pinned = this.activeSlugState();
    if (pinned) {
      const hit = staff.find((survey) => survey.slug === pinned);
      if (hit) return hit;
    }

    for (const known of KNOWN_SLUGS) {
      const hit = staff.find((survey) => survey.slug === known);
      if (hit) return hit;
    }

    return staff[0] ?? null;
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
    this.activeSlugState.set(null);
    this.persist(null, null, null);
  }

  private staffSurveys(): AuthUserSurvey[] {
    return (this.userState()?.surveys ?? []).filter((survey) => isStaffRole(survey.role));
  }

  private persist(token: string | null, user: AuthUser | null, slug: string | null): void {
    if (typeof sessionStorage === 'undefined') return;

    if (token && user) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      if (slug) sessionStorage.setItem(SURVEY_KEY, slug);
      else sessionStorage.removeItem(SURVEY_KEY);
      return;
    }

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SURVEY_KEY);
  }

  private persistActiveSlug(slug: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SURVEY_KEY, slug);
  }

  private readToken(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private readActiveSlug(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(SURVEY_KEY);
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
