/**
 * Wazi brand colors — the single source of truth for brand hexes in TS.
 *
 * The CSS side of the palette lives in `globals.css` as HSL channel tokens
 * (`--wazi-purple` / `--wazi-blue` / `--wazi-green`, and the `--primary` /
 * `--accent` tokens each theme scope maps them onto). Keep the two in sync:
 * these hexes are for places CSS can't reach — Firestore seed data, email
 * templates, and the `themeColor` meta tag.
 */
export const WAZI_COLORS = {
  /** #662d91 — primary actions, titles, logo mark. */
  purple: "#662d91",
  /** #0071bc — accents and subtitles. */
  blue: "#0071bc",
  /** #00a99d — success, numbering, pagination. */
  green: "#00a99d",
  /** #f3f3f3 — text on a brand-colored fill. */
  onBrand: "#f3f3f3",
  /** #666666 — body text on white. */
  onWhite: "#666666",
} as const;

/**
 * Theme a company starts with before it picks its own white-label colors.
 *
 * Only `primaryColor` and `accentColor` are actually rendered on a storefront
 * (see `publicCompanyThemeStyle`); `secondaryColor` is stored for future use.
 */
export const DEFAULT_COMPANY_THEME = {
  primaryColor: WAZI_COLORS.purple,
  secondaryColor: WAZI_COLORS.green,
  accentColor: WAZI_COLORS.blue,
} as const;
