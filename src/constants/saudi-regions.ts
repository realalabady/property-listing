/**
 * Curated Saudi Arabia administrative geography: 13 regions → major cities →
 * districts, each with approximate coordinates. Powers the cascading
 * country → region → city → district selects in the listing form and provides
 * the lat/lng used to plot units on the Saudi cluster map.
 *
 * Coordinates are representative (city/district centers). The dataset is not
 * exhaustive — cities without an explicit `districts` list simply skip the
 * district step, and listings fall back to the city (then region) center.
 */

export interface GeoPlace {
  id: string;
  ar: string;
  en: string;
  lat?: number;
  lng?: number;
}

export interface GeoCity extends GeoPlace {
  lat: number;
  lng: number;
  districts: GeoPlace[];
}

export interface GeoRegion extends GeoPlace {
  lat: number;
  lng: number;
  cities: GeoCity[];
}

export const SAUDI_COUNTRY = {
  id: "sa",
  ar: "المملكة العربية السعودية",
  en: "Saudi Arabia",
} as const;

const d = (id: string, ar: string, en: string, lat?: number, lng?: number): GeoPlace => ({
  id,
  ar,
  en,
  ...(lat != null ? { lat } : {}),
  ...(lng != null ? { lng } : {}),
});

export const SAUDI_REGIONS: GeoRegion[] = [
  {
    id: "riyadh",
    ar: "منطقة الرياض",
    en: "Riyadh Region",
    lat: 24.7136,
    lng: 46.6753,
    cities: [
      {
        id: "riyadh",
        ar: "الرياض",
        en: "Riyadh",
        lat: 24.7136,
        lng: 46.6753,
        districts: [
          d("olaya", "العليا", "Olaya", 24.6908, 46.685),
          d("malaz", "الملز", "Al Malaz", 24.6628, 46.7344),
          d("nakheel", "النخيل", "Al Nakheel", 24.757, 46.63),
          d("yasmin", "الياسمين", "Al Yasmin", 24.847, 46.638),
          d("dq", "حي السفارات", "Diplomatic Quarter", 24.679, 46.621),
          d("malqa", "الملقا", "Al Malqa", 24.799, 46.608),
          d("narjis", "النرجس", "Al Narjis", 24.882, 46.667),
          d("sulaimaniyah", "السليمانية", "Al Sulaimaniyah", 24.704, 46.717),
        ],
      },
      { id: "kharj", ar: "الخرج", en: "Al Kharj", lat: 24.1554, lng: 47.3346, districts: [] },
      { id: "dawadmi", ar: "الدوادمي", en: "Ad Dawadmi", lat: 24.507, lng: 44.3924, districts: [] },
      { id: "majmaah", ar: "المجمعة", en: "Al Majma'ah", lat: 25.9039, lng: 45.345, districts: [] },
      { id: "zulfi", ar: "الزلفي", en: "Az Zulfi", lat: 26.2997, lng: 44.8044, districts: [] },
      { id: "wadi-dawasir", ar: "وادي الدواسر", en: "Wadi ad-Dawasir", lat: 20.4636, lng: 44.7944, districts: [] },
    ],
  },
  {
    id: "makkah",
    ar: "منطقة مكة المكرمة",
    en: "Makkah Region",
    lat: 21.3891,
    lng: 39.8579,
    cities: [
      {
        id: "makkah",
        ar: "مكة المكرمة",
        en: "Makkah",
        lat: 21.3891,
        lng: 39.8579,
        districts: [
          d("aziziyah", "العزيزية", "Al Aziziyah", 21.39, 39.88),
          d("shisha", "الششة", "Ash Shisha", 21.42, 39.83),
          d("zahir", "الزاهر", "Az Zahir", 21.43, 39.81),
          d("naseem", "النسيم", "An Naseem", 21.45, 39.86),
        ],
      },
      {
        id: "jeddah",
        ar: "جدة",
        en: "Jeddah",
        lat: 21.4858,
        lng: 39.1925,
        districts: [
          d("rawdah", "الروضة", "Ar Rawdah", 21.58, 39.16),
          d("hamra", "الحمراء", "Al Hamra", 21.52, 39.16),
          d("shati", "الشاطئ", "Ash Shati", 21.63, 39.108),
          d("abhur-n", "أبحر الشمالية", "North Obhur", 21.74, 39.09),
          d("salamah", "السلامة", "As Salamah", 21.56, 39.18),
          d("naeem", "النعيم", "An Naeem", 21.6, 39.13),
          d("zahraa", "الزهراء", "Az Zahraa", 21.55, 39.17),
        ],
      },
      {
        id: "taif",
        ar: "الطائف",
        en: "Taif",
        lat: 21.2854,
        lng: 40.4183,
        districts: [
          d("shihar", "شهار", "Shihar", 21.29, 40.41),
          d("hawiyah", "الحوية", "Al Hawiyah", 21.43, 40.49),
        ],
      },
      { id: "rabigh", ar: "رابغ", en: "Rabigh", lat: 22.7986, lng: 39.0349, districts: [] },
      { id: "qunfudhah", ar: "القنفذة", en: "Al Qunfudhah", lat: 19.1264, lng: 41.0789, districts: [] },
    ],
  },
  {
    id: "madinah",
    ar: "منطقة المدينة المنورة",
    en: "Madinah Region",
    lat: 24.5247,
    lng: 39.5692,
    cities: [
      {
        id: "madinah",
        ar: "المدينة المنورة",
        en: "Madinah",
        lat: 24.5247,
        lng: 39.5692,
        districts: [
          d("quba", "قباء", "Quba", 24.44, 39.617),
          d("awali", "العوالي", "Al Awali", 24.43, 39.57),
          d("haram", "حي الحرم", "Central Haram", 24.468, 39.611),
          d("uyun", "العيون", "Al Uyun", 24.52, 39.59),
        ],
      },
      { id: "yanbu", ar: "ينبع", en: "Yanbu", lat: 24.0895, lng: 38.0618, districts: [] },
      { id: "ula", ar: "العلا", en: "AlUla", lat: 26.6087, lng: 37.9216, districts: [] },
      { id: "badr", ar: "بدر", en: "Badr", lat: 23.7799, lng: 38.7906, districts: [] },
    ],
  },
  {
    id: "qassim",
    ar: "منطقة القصيم",
    en: "Qassim Region",
    lat: 26.326,
    lng: 43.975,
    cities: [
      {
        id: "buraidah",
        ar: "بريدة",
        en: "Buraidah",
        lat: 26.326,
        lng: 43.975,
        districts: [
          d("rabi", "الربيع", "Ar Rabi", 26.34, 43.96),
          d("nahdah", "النهضة", "An Nahdah", 26.31, 43.99),
        ],
      },
      { id: "unaizah", ar: "عنيزة", en: "Unaizah", lat: 26.0843, lng: 43.9935, districts: [] },
      { id: "rass", ar: "الرس", en: "Ar Rass", lat: 25.8693, lng: 43.4974, districts: [] },
      { id: "mithnab", ar: "المذنب", en: "Al Mithnab", lat: 25.8616, lng: 44.2216, districts: [] },
    ],
  },
  {
    id: "eastern",
    ar: "المنطقة الشرقية",
    en: "Eastern Province",
    lat: 26.3927,
    lng: 49.9777,
    cities: [
      {
        id: "dammam",
        ar: "الدمام",
        en: "Dammam",
        lat: 26.3927,
        lng: 49.9777,
        districts: [
          d("faisaliyah", "الفيصلية", "Al Faisaliyah", 26.41, 50.06),
          d("shati-d", "الشاطئ", "Ash Shati", 26.45, 50.1),
          d("jalawiyah", "الجلوية", "Al Jalawiyah", 26.42, 50.08),
          d("noor", "النور", "An Noor", 26.4, 49.98),
        ],
      },
      {
        id: "khobar",
        ar: "الخبر",
        en: "Khobar",
        lat: 26.2794,
        lng: 50.2083,
        districts: [
          d("aqrabiyah", "العقربية", "Al Aqrabiyah", 26.3, 50.2),
          d("rakah", "الراكة", "Ar Rakah", 26.33, 50.19),
          d("thuqbah", "الثقبة", "Ath Thuqbah", 26.27, 50.2),
          d("yarmouk", "اليرموك", "Al Yarmouk", 26.25, 50.19),
        ],
      },
      { id: "dhahran", ar: "الظهران", en: "Dhahran", lat: 26.2886, lng: 50.15, districts: [] },
      { id: "ahsa", ar: "الأحساء", en: "Al Ahsa", lat: 25.3833, lng: 49.587, districts: [] },
      { id: "jubail", ar: "الجبيل", en: "Jubail", lat: 27.0046, lng: 49.646, districts: [] },
      { id: "qatif", ar: "القطيف", en: "Qatif", lat: 26.565, lng: 49.996, districts: [] },
      { id: "hafar", ar: "حفر الباطن", en: "Hafar Al-Batin", lat: 28.4326, lng: 45.9636, districts: [] },
    ],
  },
  {
    id: "asir",
    ar: "منطقة عسير",
    en: "Asir Region",
    lat: 18.2164,
    lng: 42.5053,
    cities: [
      {
        id: "abha",
        ar: "أبها",
        en: "Abha",
        lat: 18.2164,
        lng: 42.5053,
        districts: [
          d("manhal", "المنهل", "Al Manhal", 18.23, 42.5),
          d("numas-d", "حي النميص", "An Namas District", 18.2, 42.51),
        ],
      },
      { id: "khamis", ar: "خميس مشيط", en: "Khamis Mushait", lat: 18.3, lng: 42.73, districts: [] },
      { id: "namas", ar: "النماص", en: "An Namas", lat: 19.1, lng: 42.12, districts: [] },
      { id: "bisha", ar: "بيشة", en: "Bisha", lat: 20.0, lng: 42.6, districts: [] },
    ],
  },
  {
    id: "tabuk",
    ar: "منطقة تبوك",
    en: "Tabuk Region",
    lat: 28.3838,
    lng: 36.555,
    cities: [
      { id: "tabuk", ar: "تبوك", en: "Tabuk", lat: 28.3838, lng: 36.555, districts: [] },
      { id: "duba", ar: "ضباء", en: "Duba", lat: 27.3493, lng: 35.6961, districts: [] },
      { id: "wajh", ar: "الوجه", en: "Al Wajh", lat: 26.2417, lng: 36.4642, districts: [] },
      { id: "tayma", ar: "تيماء", en: "Tayma", lat: 27.6296, lng: 38.5497, districts: [] },
    ],
  },
  {
    id: "hail",
    ar: "منطقة حائل",
    en: "Ha'il Region",
    lat: 27.5114,
    lng: 41.7208,
    cities: [
      { id: "hail", ar: "حائل", en: "Ha'il", lat: 27.5114, lng: 41.7208, districts: [] },
      { id: "baqaa", ar: "بقعاء", en: "Baqaa", lat: 27.88, lng: 42.96, districts: [] },
    ],
  },
  {
    id: "northern",
    ar: "منطقة الحدود الشمالية",
    en: "Northern Borders",
    lat: 30.9753,
    lng: 41.0381,
    cities: [
      { id: "arar", ar: "عرعر", en: "Arar", lat: 30.9753, lng: 41.0381, districts: [] },
      { id: "rafha", ar: "رفحاء", en: "Rafha", lat: 29.6202, lng: 43.4904, districts: [] },
      { id: "turaif", ar: "طريف", en: "Turaif", lat: 31.6725, lng: 38.6637, districts: [] },
    ],
  },
  {
    id: "jazan",
    ar: "منطقة جازان",
    en: "Jazan Region",
    lat: 16.8892,
    lng: 42.5511,
    cities: [
      { id: "jazan", ar: "جازان", en: "Jazan", lat: 16.8892, lng: 42.5511, districts: [] },
      { id: "sabya", ar: "صبيا", en: "Sabya", lat: 17.1493, lng: 42.6255, districts: [] },
      { id: "abu-arish", ar: "أبو عريش", en: "Abu Arish", lat: 16.9686, lng: 42.832, districts: [] },
    ],
  },
  {
    id: "najran",
    ar: "منطقة نجران",
    en: "Najran Region",
    lat: 17.4924,
    lng: 44.1277,
    cities: [
      { id: "najran", ar: "نجران", en: "Najran", lat: 17.4924, lng: 44.1277, districts: [] },
      { id: "sharurah", ar: "شرورة", en: "Sharurah", lat: 17.4869, lng: 47.1057, districts: [] },
    ],
  },
  {
    id: "bahah",
    ar: "منطقة الباحة",
    en: "Al Bahah Region",
    lat: 20.0129,
    lng: 41.4677,
    cities: [
      { id: "bahah", ar: "الباحة", en: "Al Bahah", lat: 20.0129, lng: 41.4677, districts: [] },
      { id: "baljurashi", ar: "بلجرشي", en: "Baljurashi", lat: 19.8593, lng: 41.5676, districts: [] },
    ],
  },
  {
    id: "jawf",
    ar: "منطقة الجوف",
    en: "Al Jawf Region",
    lat: 29.9697,
    lng: 40.2064,
    cities: [
      { id: "sakaka", ar: "سكاكا", en: "Sakaka", lat: 29.9697, lng: 40.2064, districts: [] },
      { id: "qurayyat", ar: "القريات", en: "Qurayyat", lat: 31.3318, lng: 37.3428, districts: [] },
      { id: "dumat", ar: "دومة الجندل", en: "Dumat Al-Jandal", lat: 29.8117, lng: 39.8675, districts: [] },
    ],
  },
];

export function findRegion(regionId: string): GeoRegion | undefined {
  return SAUDI_REGIONS.find((r) => r.id === regionId);
}

export function findCity(regionId: string, cityId: string): GeoCity | undefined {
  return findRegion(regionId)?.cities.find((c) => c.id === cityId);
}

export function findDistrict(
  regionId: string,
  cityId: string,
  districtId: string,
): GeoPlace | undefined {
  return findCity(regionId, cityId)?.districts.find((x) => x.id === districtId);
}

/**
 * Resolve the best-available coordinates for an administrative selection,
 * falling back district → city → region → country center.
 */
export function resolveCoords(
  regionId?: string,
  cityId?: string,
  districtId?: string,
): { lat: number; lng: number } {
  if (regionId && cityId && districtId) {
    const dist = findDistrict(regionId, cityId, districtId);
    if (dist?.lat != null && dist?.lng != null) {
      return { lat: dist.lat, lng: dist.lng };
    }
  }
  if (regionId && cityId) {
    const city = findCity(regionId, cityId);
    if (city) return { lat: city.lat, lng: city.lng };
  }
  if (regionId) {
    const region = findRegion(regionId);
    if (region) return { lat: region.lat, lng: region.lng };
  }
  return { lat: 24.7136, lng: 46.6753 }; // Riyadh / country center
}

const norm = (value?: string) => (value ?? "").trim().toLowerCase();

/**
 * Resolve coordinates from human-readable place names (Arabic or English) as a
 * fallback for listings stored without explicit lat/lng. Matches district
 * within a city, then city across all regions, then region.
 */
export function resolveCoordsByName(
  region?: string,
  city?: string,
  district?: string,
): { lat: number; lng: number } | null {
  for (const r of SAUDI_REGIONS) {
    for (const c of r.cities) {
      if (norm(c.ar) === norm(city) || norm(c.en) === norm(city)) {
        if (district) {
          const dist = c.districts.find(
            (x) => norm(x.ar) === norm(district) || norm(x.en) === norm(district),
          );
          if (dist?.lat != null && dist?.lng != null) {
            return { lat: dist.lat, lng: dist.lng };
          }
        }
        return { lat: c.lat, lng: c.lng };
      }
    }
  }
  for (const r of SAUDI_REGIONS) {
    if (norm(r.ar) === norm(region) || norm(r.en) === norm(region)) {
      return { lat: r.lat, lng: r.lng };
    }
  }
  return null;
}

/** Geographic center + default zoom for the Saudi cluster map. */
export const SAUDI_MAP_CENTER = { lat: 23.8859, lng: 45.0792 };
export const SAUDI_MAP_ZOOM = 5.4;
