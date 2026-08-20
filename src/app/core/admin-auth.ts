import { Service, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthUser, LoginResponse } from './api-models';

const TOKEN_KEY = 'bubblecore.admin.token';
const USER_KEY = 'bubblecore.admin.user';

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

  hasSurveyAccess(slug = environment.surveySlug): boolean {
    return this.userState()?.surveys.some((survey) => survey.slug === slug) ?? false;
  }

  lock(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.persist(null, null);
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
