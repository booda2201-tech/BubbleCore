/**
 * The API stores a single string per question title / subtitle / option text.
 * To serve Arabic + English from one field we pack both as `arabic||english`.
 *
 * - Legacy strings without the separator are treated as Arabic-only and shown
 *   as-is in every language.
 * - A missing English part falls back to the Arabic text.
 */
export const LOCALIZED_SEPARATOR = '||';

export type TextLang = 'ar' | 'en';

export interface LocalizedParts {
  ar: string;
  en: string;
}

export function splitLocalized(raw: string | null | undefined): LocalizedParts {
  const value = raw ?? '';
  const index = value.indexOf(LOCALIZED_SEPARATOR);
  if (index < 0) return { ar: value.trim(), en: '' };

  return {
    ar: value.slice(0, index).trim(),
    en: value.slice(index + LOCALIZED_SEPARATOR.length).trim(),
  };
}

/** Combine both languages; English is dropped when empty. */
export function joinLocalized(ar: string, en: string): string {
  const arabic = ar.trim();
  const english = en.trim();
  return english ? `${arabic}${LOCALIZED_SEPARATOR}${english}` : arabic;
}

/** Text to show for the active language, with Arabic as the fallback. */
export function pickLocalized(raw: string | null | undefined, lang: TextLang): string {
  const { ar, en } = splitLocalized(raw);
  return lang === 'en' ? en || ar : ar;
}
