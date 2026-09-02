/**
 * Closed option lists for the public "become a partner" form. Both the form
 * selects and the server-side validator read from here, so a submission can
 * only ever carry a value the UI actually offers.
 */

export interface PartnerOption {
  value: string;
  ar: string;
  en: string;
}

/** How the applicant heard about the platform — an attribution channel. */
export const HEAR_ABOUT_SOURCES: PartnerOption[] = [
  { value: "word_of_mouth", ar: "سمعت عنكم من أحد", en: "Word of mouth" },
  { value: "friend", ar: "صديق أو زميل", en: "Friend or colleague" },
  { value: "whatsapp", ar: "واتساب", en: "WhatsApp" },
  { value: "search_engine", ar: "محرك بحث (جوجل)", en: "Search engine (Google)" },
  { value: "social_media", ar: "وسائل التواصل الاجتماعي", en: "Social media" },
  { value: "advertisement", ar: "إعلان", en: "Advertisement" },
  { value: "event", ar: "معرض أو فعالية", en: "Event or exhibition" },
  { value: "existing_partner", ar: "شركة عقارية أخرى على المنصة", en: "Another agency on the platform" },
  { value: "other", ar: "أخرى", en: "Other" },
];

/**
 * Major Saudi cities, at least one per administrative region, plus an explicit
 * "other" so a company outside the list is never blocked from applying.
 */
export const PARTNER_CITIES: PartnerOption[] = [
  { value: "riyadh", ar: "الرياض", en: "Riyadh" },
  { value: "kharj", ar: "الخرج", en: "Al Kharj" },
  { value: "dawadmi", ar: "الدوادمي", en: "Dawadmi" },
  { value: "majmaah", ar: "المجمعة", en: "Al Majmaah" },
  { value: "makkah", ar: "مكة المكرمة", en: "Makkah" },
  { value: "jeddah", ar: "جدة", en: "Jeddah" },
  { value: "taif", ar: "الطائف", en: "Taif" },
  { value: "rabigh", ar: "رابغ", en: "Rabigh" },
  { value: "qunfudhah", ar: "القنفذة", en: "Al Qunfudhah" },
  { value: "madinah", ar: "المدينة المنورة", en: "Madinah" },
  { value: "yanbu", ar: "ينبع", en: "Yanbu" },
  { value: "buraidah", ar: "بريدة", en: "Buraidah" },
  { value: "unaizah", ar: "عنيزة", en: "Unaizah" },
  { value: "rass", ar: "الرس", en: "Ar Rass" },
  { value: "dammam", ar: "الدمام", en: "Dammam" },
  { value: "khobar", ar: "الخبر", en: "Al Khobar" },
  { value: "dhahran", ar: "الظهران", en: "Dhahran" },
  { value: "ahsa", ar: "الأحساء", en: "Al Ahsa" },
  { value: "jubail", ar: "الجبيل", en: "Jubail" },
  { value: "qatif", ar: "القطيف", en: "Qatif" },
  { value: "hafar_albatin", ar: "حفر الباطن", en: "Hafar Al Batin" },
  { value: "abha", ar: "أبها", en: "Abha" },
  { value: "khamis_mushait", ar: "خميس مشيط", en: "Khamis Mushait" },
  { value: "bisha", ar: "بيشة", en: "Bisha" },
  { value: "tabuk", ar: "تبوك", en: "Tabuk" },
  { value: "hail", ar: "حائل", en: "Hail" },
  { value: "arar", ar: "عرعر", en: "Arar" },
  { value: "jazan", ar: "جازان", en: "Jazan" },
  { value: "sabya", ar: "صبيا", en: "Sabya" },
  { value: "najran", ar: "نجران", en: "Najran" },
  { value: "bahah", ar: "الباحة", en: "Al Bahah" },
  { value: "sakaka", ar: "سكاكا", en: "Sakaka" },
  { value: "qurayyat", ar: "القريات", en: "Qurayyat" },
  { value: "other", ar: "مدينة أخرى", en: "Another city" },
];

function findOption(options: PartnerOption[], value: unknown): PartnerOption | null {
  if (typeof value !== "string") return null;
  return options.find((option) => option.value === value) ?? null;
}

export function isHearAboutSource(value: unknown): boolean {
  return findOption(HEAR_ABOUT_SOURCES, value) !== null;
}

export function isPartnerCity(value: unknown): boolean {
  return findOption(PARTNER_CITIES, value) !== null;
}

/** Arabic label for storage/display; falls back to the raw value. */
export function hearAboutLabelAr(value: string): string {
  return findOption(HEAR_ABOUT_SOURCES, value)?.ar ?? value;
}

export function partnerCityLabelAr(value: string): string {
  return findOption(PARTNER_CITIES, value)?.ar ?? value;
}
