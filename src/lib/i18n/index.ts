import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** The platform is Saudi-first: Arabic is the default rendered language. */
export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  ar: "rtl",
  en: "ltr",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

export type Dictionary = { [key: string]: string | string[] | Dictionary };

const dictionaries: Record<Locale, Dictionary> = {
  ar: ar as Dictionary,
  en: en as Dictionary,
};

/**
 * Returns the dictionary for a given locale.
 * Falls back to the default locale (Arabic) for unknown codes.
 */
export function getDictionary(locale: Locale | string = DEFAULT_LOCALE): Dictionary {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return dictionaries[locale as Locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

function resolve(dict: Dictionary, key: string): unknown {
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
      return undefined;
    }
  }
  return current;
}

/**
 * Translate a dot-path key against the default (Arabic) dictionary.
 *   t("common.save") -> "حفظ"
 *
 * Optional `vars` interpolates `{name}` style placeholders.
 * Works in both Server and Client Components because the locale is static
 * (Arabic-only). Returns the key itself if missing, making gaps obvious.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = resolve(dictionaries[DEFAULT_LOCALE], key);
  let str = typeof value === "string" ? value : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

/**
 * Returns an array value from the dictionary (for lists of strings).
 * Returns an empty array if the key is missing or not an array.
 */
export function tList(key: string): string[] {
  const value = resolve(dictionaries[DEFAULT_LOCALE], key);
  return Array.isArray(value) ? (value as string[]) : [];
}
