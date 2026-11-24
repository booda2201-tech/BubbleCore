const ARABIC_LETTERS = /[\u0600-\u06FF\u0750-\u077F]/;

export function hasArabic(text: string): boolean {
  return ARABIC_LETTERS.test(text);
}

/**
 * Best-effort Arabic -> English translation for the admin editor.
 * Tries Google's public endpoint first, then MyMemory. Returns null when both fail.
 */
export async function translateArabicToEnglish(text: string): Promise<string | null> {
  const source = text.trim();
  if (!source) return '';

  return (await viaGoogle(source)) ?? (await viaMyMemory(source));
}

async function viaGoogle(text: string): Promise<string | null> {
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=' +
      encodeURIComponent(text);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    const segments = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : null;
    if (!segments) return null;
    const result = segments
      .map((segment: unknown) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
      .join('')
      .trim();
    return result || null;
  } catch {
    return null;
  }
}

async function viaMyMemory(text: string): Promise<string | null> {
  try {
    const url =
      'https://api.mymemory.translated.net/get?langpair=ar|en&q=' + encodeURIComponent(text);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { responseData?: { translatedText?: string } };
    const result = data.responseData?.translatedText?.trim();
    return result || null;
  } catch {
    return null;
  }
}
