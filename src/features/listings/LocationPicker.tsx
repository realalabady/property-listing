"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { SAUDI_MAP_CENTER, SAUDI_MAP_ZOOM } from "@/constants/saudi-regions";

interface LocationPickerProps {
  /** Current pin latitude, or null when no pin has been dropped yet. */
  lat: number | null;
  /** Current pin longitude, or null when no pin has been dropped yet. */
  lng: number | null;
  /** Fired whenever the user clicks the map or drags the pin. */
  onChange: (lat: number, lng: number) => void;
  /**
   * When no pin exists yet, recenters the map here (e.g. the selected city's
   * center) so the user starts near the right area instead of the whole KSA.
   */
  centerHint?: { lat: number; lng: number } | null;
  className?: string;
}

/** Hard pan limit — tight to Saudi so the picker can't drift off it. */
const SAUDI_BOUNDS: [[number, number], [number, number]] = [
  [16.0, 34.0],
  [32.6, 56.2],
];
/**
 * Accept-region for a dropped pin: Saudi's land extent. A pin outside this box
 * is rejected ("wrong location"). It's a bounding box, not the exact border,
 * but the map is also pan/zoom-locked to Saudi so a pin can't land far off.
 */
const SAUDI_MIN_LAT = 16.0;
const SAUDI_MAX_LAT = 32.2;
const SAUDI_MIN_LNG = 34.5;
const SAUDI_MAX_LNG = 55.7;

function isInSaudi(lat: number, lng: number): boolean {
  return (
    lat >= SAUDI_MIN_LAT &&
    lat <= SAUDI_MAX_LAT &&
    lng >= SAUDI_MIN_LNG &&
    lng <= SAUDI_MAX_LNG
  );
}

/** Zoom used once a specific pin (or a city) is in focus. */
const PIN_ZOOM = 15;
const CITY_ZOOM = 12;

/** A teardrop map pin, in the same green as the marketplace cluster pins. */
const PIN_HTML = `
  <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(15,23,42,.35));">
    <path d="M16 0C7.163 0 0 7.03 0 15.7 0 27.5 16 40 16 40s16-12.5 16-24.3C32 7.03 24.837 0 16 0z" fill="hsl(158 64% 30%)" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5.5" fill="#fff"/>
  </svg>`;

/**
 * Interactive Saudi map for picking a listing's exact location. The user clicks
 * anywhere (or drags the pin) to set precise coordinates — no Google Maps link
 * to paste, which is both faster and more accurate for data entry.
 */
export default function LocationPicker({
  lat,
  lng,
  onChange,
  centerHint = null,
  className,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Latest onChange in a ref so the click/drag handlers never need rebinding.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Last accepted (in-Saudi) coords, so a drag that ends outside can snap back.
  const lastValidRef = useRef<[number, number] | null>(null);
  const [ready, setReady] = useState(false);
  // Shown when a click/drag lands outside Saudi — the pin is refused.
  const [rejected, setRejected] = useState(false);

  // Move (or create) the pin without firing onChange — used to reflect external
  // state (edit-mode hydration) back onto the map. Reads L/map/icon from refs.
  function syncPin(nextLat: number, nextLng: number) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    lastValidRef.current = [nextLat, nextLng];
    if (markerRef.current) {
      markerRef.current.setLatLng([nextLat, nextLng]);
      return;
    }
    const marker = L.marker([nextLat, nextLng], {
      icon: iconRef.current,
      draggable: true,
    }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      // A drag can end anywhere, including across a border → validate it. If it
      // lands outside Saudi, snap the pin back to its last accepted spot.
      if (!isInSaudi(p.lat, p.lng)) {
        setRejected(true);
        const back = lastValidRef.current;
        if (back) marker.setLatLng(back);
        return;
      }
      setRejected(false);
      lastValidRef.current = [p.lat, p.lng];
      onChangeRef.current(p.lat, p.lng);
    });
    markerRef.current = marker;
  }

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      const hasPin = lat != null && lng != null;
      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
        maxZoom: 18,
        maxBounds: SAUDI_BOUNDS,
        maxBoundsViscosity: 1.0,
      }).setView(
        hasPin
          ? [lat as number, lng as number]
          : centerHint
            ? [centerHint.lat, centerHint.lng]
            : [SAUDI_MAP_CENTER.lat, SAUDI_MAP_CENTER.lng],
        hasPin ? PIN_ZOOM : centerHint ? CITY_ZOOM : SAUDI_MAP_ZOOM,
      );

      map.attributionControl.setPrefix(false);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      iconRef.current = L.divIcon({
        className: "dar-pick-pin",
        html: PIN_HTML,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      mapRef.current = map;
      if (hasPin) syncPin(lat as number, lng as number);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        // Refuse a pin outside Saudi and tell the user; don't move the marker.
        if (!isInSaudi(clickedLat, clickedLng)) {
          setRejected(true);
          return;
        }
        setRejected(false);
        syncPin(clickedLat, clickedLng);
        onChangeRef.current(clickedLat, clickedLng);
      });

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;

      requestAnimationFrame(() => {
        if (cancelled) return;
        map.invalidateSize();
        // Lock zoom-out to the level that frames all of Saudi, so the user can
        // never zoom/pan out to neighbouring countries.
        const fitZoom = map.getBoundsZoom(SAUDI_BOUNDS);
        map.setMinZoom(fitZoom);
        if (map.getZoom() < fitZoom) map.setZoom(fitZoom);
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        iconRef.current = null;
        LRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect external coordinate changes onto the map (e.g. edit-mode hydration
  // arriving after mount, or the pin being cleared).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (lat != null && lng != null) {
      syncPin(lat, lng);
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), PIN_ZOOM));
    } else if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, ready]);

  // With no pin yet, recenter on the selected city so the user starts close.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (lat == null && lng == null && centerHint) {
      mapRef.current.setView([centerHint.lat, centerHint.lng], CITY_ZOOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerHint?.lat, centerHint?.lng, ready]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={className}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        role="application"
        aria-label="اختر موقع العقار على الخريطة"
      />
      {rejected && (
        <div
          role="alert"
          className="pointer-events-none absolute inset-x-2 bottom-2 z-[400] rounded-lg bg-destructive/95 px-3 py-2 text-center text-xs font-medium text-white shadow-lg"
        >
          موقع خاطئ — يجب أن يكون داخل حدود المملكة العربية السعودية
        </div>
      )}
    </div>
  );
}
