import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LOCALES = ["en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  ar: ar as Dictionary,
};

/**
 * Returns the dictionary for a given locale.
 * Falls back to default locale for unknown codes.
 */
export function getDictionary(locale: Locale | string): Dictionary {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return dictionaries[locale as Locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

/**
 * Safe nested-key translation.
 *   t(dict, 'common.save') -> dict.common.save
 * Returns the key itself if not found (makes missing keys obvious).
 */
export function t(dict: Dictionary, key: string): string {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const p of parts) {
    if (
      current &&
      typeof current === "object" &&
      p in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}
