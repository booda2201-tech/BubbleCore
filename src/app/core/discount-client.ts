import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { SurveyApi } from './survey-api';

const UUID_KEY = `bubble-core.discount.clientUuid.${environment.surveySlug}`;

@Service()
export class DiscountClient {
  private readonly api = inject(SurveyApi);

  clientUuid(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(UUID_KEY)?.trim();
    return value || null;
  }

  /** First visit only: ask the API for a clientUuid and keep it. */
  async ensureSession(): Promise<string | null> {
    const existing = this.clientUuid();
    if (existing) return existing;

    try {
      const session = await this.api.createDiscountSession();
      const uuid = session.clientUuid?.trim();
      if (!uuid) return null;
      localStorage.setItem(UUID_KEY, uuid);
      return uuid;
    } catch {
      return null;
    }
  }

  fingerprint(): string {
    if (typeof navigator === 'undefined') return '';

    const screenInfo =
      typeof screen === 'undefined' ? '' : `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    const raw = [navigator.userAgent, navigator.language, screenInfo, timeZone].join('|');
    return fnv1a(raw);
  }
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
