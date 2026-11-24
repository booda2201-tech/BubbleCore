import { Service, inject, signal } from '@angular/core';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { SurveyApi } from './survey-api';
import { SurveyContext } from './survey-context';

@Service()
export class DiscountClient {
  private readonly api = inject(SurveyApi);
  private readonly context = inject(SurveyContext);

  readonly fingerprintValue = signal('');
  readonly ready = signal(false);
  private readyForSlug = '';

  clientUuid(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(this.uuidKey())?.trim();
    return value || null;
  }

  /** First visit: fingerprint + durable clientUuid from the survey discount API. */
  async ensureSession(): Promise<string | null> {
    const slug = this.context.slug();
    const fingerprint = await this.resolveFingerprint();
    this.fingerprintValue.set(fingerprint);

    const existing = this.clientUuid();
    if (existing) {
      this.ready.set(true);
      this.readyForSlug = slug;
      return existing;
    }

    try {
      const session = await this.api.createDiscountSession();
      const uuid = session.clientUuid?.trim();
      if (uuid) {
        localStorage.setItem(this.uuidKey(), uuid);
        this.ready.set(true);
        this.readyForSlug = slug;
        return uuid;
      }
    } catch {
      // Fall through to a local UUID so later requests stay consistent.
    }

    const localUuid = crypto.randomUUID();
    localStorage.setItem(this.uuidKey(), localUuid);
    this.ready.set(true);
    this.readyForSlug = slug;
    return localUuid;
  }

  fingerprint(): string {
    return this.fingerprintValue() || this.syncFingerprintFallback();
  }

  private uuidKey(): string {
    return `bubble-core.discount.clientUuid.${this.context.slug()}`;
  }

  private fingerprintKey(): string {
    return `bubble-core.discount.fingerprint.${this.context.slug()}`;
  }

  private async resolveFingerprint(): Promise<string> {
    if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(this.fingerprintKey())?.trim();
      if (cached) return cached;
    }

    // Reuse a fingerprint already resolved for another channel in this session.
    if (this.fingerprintValue() && this.readyForSlug && this.readyForSlug !== this.context.slug()) {
      persistSession(this.fingerprintKey(), this.fingerprintValue());
      return this.fingerprintValue();
    }

    try {
      const agent = await FingerprintJS.load();
      const result = await agent.get();
      if (result.visitorId) {
        persistSession(this.fingerprintKey(), result.visitorId);
        return result.visitorId;
      }
    } catch {
      // Fall through to a manual canvas/WebGL fingerprint.
    }

    const manual = await manualFingerprint();
    persistSession(this.fingerprintKey(), manual);
    return manual;
  }

  private syncFingerprintFallback(): string {
    if (typeof navigator === 'undefined') return '';
    const screenInfo =
      typeof screen === 'undefined' ? '' : `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return fnv1a([navigator.userAgent, navigator.language, screenInfo, timeZone].join('|'));
  }
}

function persistSession(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(key, value);
}

async function manualFingerprint(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ''),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    await canvasFingerprint(),
    webglFingerprint(),
  ];
  return fnv1a(parts.join('|'));
}

async function canvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f26b09';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#2bb6af';
    ctx.fillText('BubbleHope', 8, 16);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function webglFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return '';
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : '';
    const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
    return `${vendor}|${renderer}`;
  } catch {
    return '';
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
