import { Service, signal } from '@angular/core';

/**
 * Demo-only gate for the hidden admin area. A real deployment must verify the
 * secret on a server; this only keeps the dashboard out of casual reach.
 */
const ADMIN_PASSWORD = 'bubble2026';
const SESSION_KEY = 'bubblecore.admin.session';

@Service()
export class AdminAuth {
  private readonly unlocked = signal<boolean>(this.restore());

  readonly isUnlocked = this.unlocked.asReadonly();

  unlock(password: string): boolean {
    const ok = password.trim() === ADMIN_PASSWORD;
    if (ok) {
      this.unlocked.set(true);
      this.store(true);
    }
    return ok;
  }

  lock(): void {
    this.unlocked.set(false);
    this.store(false);
  }

  private restore(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  private store(value: boolean): void {
    if (typeof sessionStorage === 'undefined') return;
    if (value) {
      sessionStorage.setItem(SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
}
