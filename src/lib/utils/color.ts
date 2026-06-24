const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!HEX_COLOR_RE.test(next)) return null;
  return next.toLowerCase();
}

export function hexToHslChannels(hex: string): string | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const raw = normalized.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
