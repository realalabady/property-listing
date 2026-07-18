/**
 * Extract latitude/longitude from a pasted map link (or raw coordinates).
 *
 * Data-entry staff copy a location from Google Maps and paste it here so the
 * property pin lands on the exact building instead of the city center. This
 * covers the coordinate-bearing formats Google produces:
 *
 *   - Place marker:   ...!3d24.774265!4d46.738586      (the actual pinned point)
 *   - Viewport/@:     .../@24.774265,46.738586,17z
 *   - Query params:   ?q=24.77,46.73 / &ll= / &query= / &center= / &destination=
 *   - Raw text:       "24.774265, 46.738586"
 *
 * Short links (maps.app.goo.gl, goo.gl/maps) carry NO coordinates — they must
 * be resolved by following the redirect first (see /api/geo/resolve-map-url),
 * then the resolved URL is passed back through here.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ExtractOptions {
  /**
   * Allow the loose "lat,lng" fallback. Safe for user-pasted strings, but
   * disabled when scanning a full HTML body (where stray number pairs abound).
   */
  allowBareCoords?: boolean;
}

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

function validate(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < LAT_MIN || lat > LAT_MAX) return null;
  if (lng < LNG_MIN || lng > LNG_MAX) return null;
  // (0, 0) is "null island" — practically always a parsing artifact, never a
  // real Saudi property.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function extractLatLngFromMapUrl(
  input: string,
  options: ExtractOptions = {},
): LatLng | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const { allowBareCoords = true } = options;

  // Percent-decode so patterns inside encoded query params still match.
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    // Malformed escapes — fall back to the raw string.
    text = raw;
  }

  // 1. Place marker (!3d<lat>!4d<lng>) — the exact pinned point, most precise.
  const marker = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (marker) {
    const result = validate(Number(marker[1]), Number(marker[2]));
    if (result) return result;
  }

  // 2. Viewport / place center (@<lat>,<lng>).
  const at = text.match(/@(-?\d+(?:\.\d+)?),\s*\+?\s*(-?\d+(?:\.\d+)?)/);
  if (at) {
    const result = validate(Number(at[1]), Number(at[2]));
    if (result) return result;
  }

  // 3. Coordinate-bearing query params, incl. the /maps/search/<lat>,<lng>
  //    path. Google encodes the separating space as "+" (e.g. "24.7,+46.6"),
  //    which decodeURIComponent leaves intact — so tolerate an optional "+".
  const param = text.match(
    /(?:[?&/](?:q|query|ll|sll|center|destination|daddr|search)[=/])\s*(-?\d+(?:\.\d+)?),\s*\+?\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (param) {
    const result = validate(Number(param[1]), Number(param[2]));
    if (result) return result;
  }

  // 4. Loose "lat,lng" — last resort for a raw paste (opt-out for HTML bodies).
  //    Also tolerates the "24.7,+46.6" space-as-plus encoding.
  if (allowBareCoords) {
    const bare = text.match(
      /(-?\d{1,2}(?:\.\d+)?)\s*,\s*\+?\s*(-?\d{1,3}(?:\.\d+)?)/,
    );
    if (bare) {
      const result = validate(Number(bare[1]), Number(bare[2]));
      if (result) return result;
    }
  }

  return null;
}
