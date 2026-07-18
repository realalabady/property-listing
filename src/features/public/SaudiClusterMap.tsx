"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  resolveCoordsByName,
  SAUDI_MAP_CENTER,
  SAUDI_MAP_ZOOM,
  SAUDI_REGIONS,
} from "@/constants/saudi-regions";
import { ROUTES } from "@/constants/routes";
import { formatNumber } from "@/lib/utils/format";
import { rentPeriodSuffix } from "./filters";
import type { PublicListing } from "./data";

interface SaudiClusterMapProps {
  listings: PublicListing[];
  className?: string;
  /** Listing id to visually emphasise on the map (card-hover sync). */
  hoveredId?: string | null;
  /** Fired when the pointer enters/leaves a price pin (pin-hover sync). */
  onHoverListing?: (id: string | null) => void;
}

/** Hard pan limit — tight to Saudi so you can't drift left/right off it. */
const SAUDI_BOUNDS: [[number, number], [number, number]] = [
  [16.0, 34.0],
  [32.6, 56.2],
];
/** Frame the initial view tight to Saudi (used to derive the min zoom too). */
const SAUDI_FIT: [[number, number], [number, number]] = [
  [16.2, 34.4],
  [32.3, 55.8],
];
/** Below this zoom the map shows region bubbles; at/above it, price pins. */
const REGION_ZOOM = 8;

/** Compact Arabic price label: 1_200_000 → "1.2 مليون", 110_000 → "110 ألف". */
function compactPrice(n: number): string {
  const trim = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
  if (n >= 1_000_000) return `${trim(n / 1_000_000)} مليون`;
  if (n >= 1_000) return `${trim(n / 1_000)} ألف`;
  return formatNumber(n);
}

/** Small deterministic jitter (~1km) so units at the same center don't overlap. */
function jitter(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const jx = ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.02;
  const jy = ((Math.abs(h >> 5) % 1000) / 1000 - 0.5) * 0.02;
  return [jx, jy];
}

function coordsFor(
  listing: PublicListing,
): { lat: number; lng: number; precise: boolean } | null {
  // An exact pin (pasted from Google Maps) is used verbatim — no jitter. A
  // legacy listing that only stored the city center is NOT precise, so it
  // still gets jittered to avoid every unit stacking on one point.
  if (listing.lat != null && listing.lng != null) {
    return { lat: listing.lat, lng: listing.lng, precise: listing.precise };
  }
  const byName = resolveCoordsByName(
    listing.region,
    listing.city,
    listing.district,
  );
  return byName ? { ...byName, precise: false } : null;
}

const norm = (value?: string) => (value ?? "").trim().toLowerCase();

/** Match a listing to one of the 13 regions by stored region/city name. */
function regionIdFor(listing: PublicListing): string | null {
  for (const r of SAUDI_REGIONS) {
    if (norm(r.ar) === norm(listing.region) || norm(r.en) === norm(listing.region)) {
      return r.id;
    }
  }
  for (const r of SAUDI_REGIONS) {
    for (const c of r.cities) {
      if (norm(c.ar) === norm(listing.city) || norm(c.en) === norm(listing.city)) {
        return r.id;
      }
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Applies/clears the hover emphasis on a pin (or cluster) DOM element.
 * Styling is inline so it works without touching globals.css.
 */
function styleHighlight(el: HTMLElement | null, on: boolean) {
  if (!el) return;
  const pill = (el.querySelector(".dar-price-pin__pill") ??
    el.firstElementChild ??
    el) as HTMLElement;
  pill.style.transition = "transform .15s ease, box-shadow .15s ease";
  pill.style.transform = on ? "scale(1.18)" : "";
  pill.style.boxShadow = on ? "0 6px 18px rgba(15,23,42,.35)" : "";
}

export default function SaudiClusterMap({
  listings,
  className,
  hoveredId = null,
  onHoverListing,
}: SaudiClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionLayerRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Marker lookup for the hover sync, plus the element currently emphasised.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersByIdRef = useRef<Map<string, any>>(new Map());
  const highlightedElRef = useRef<HTMLElement | null>(null);
  // Latest hover callback in a ref so markers never need re-binding when the
  // parent re-renders with a new function identity.
  const hoverCbRef = useRef<SaudiClusterMapProps["onHoverListing"]>(onHoverListing);
  hoverCbRef.current = onHoverListing;
  // Flips true once the map + layers exist, so the marker effect (which can
  // run before the async init finishes) re-runs and actually populates.
  const [ready, setReady] = useState(false);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        attributionControl: true,
        zoomControl: true,
        maxZoom: 18,
        maxBounds: SAUDI_BOUNDS,
        maxBoundsViscosity: 1.0,
      }).setView([SAUDI_MAP_CENTER.lat, SAUDI_MAP_CENTER.lng], SAUDI_MAP_ZOOM);

      // Remove Leaflet's default "Leaflet 🇺🇦" prefix (the Ukraine flag).
      map.attributionControl.setPrefix(false);

      // Default: modern, clean street basemap (Carto Voyager), retina-ready.
      const voyager = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      // Satellite: Esri World Imagery + a labels overlay so it stays readable.
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "&copy; <a href='https://www.esri.com'>Esri</a>, Maxar, Earthstar Geographics",
          maxZoom: 19,
        },
      );
      const satelliteLabels = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19 },
      );
      satellite.on("add", () => satelliteLabels.addTo(map));
      satellite.on("remove", () => map.removeLayer(satelliteLabels));

      L.control
        .layers(
          { "الخريطة": voyager, "قمر صناعي": satellite },
          undefined,
          { position: "topright", collapsed: false },
        )
        .addTo(map);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount();
          const size = count < 10 ? 34 : count < 100 ? 40 : 48;
          return L.divIcon({
            html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:hsl(158 64% 30%);color:#fff;font-size:13px;font-weight:700;border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.25);">${count}</div>`,
            className: "",
            iconSize: [size, size],
          });
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const regionLayer = (L as any).layerGroup();

      mapRef.current = map;
      clusterRef.current = cluster;
      regionLayerRef.current = regionLayer;

      const refreshLayers = () => {
        const z = map.getZoom();
        if (z < REGION_ZOOM) {
          if (map.hasLayer(cluster)) map.removeLayer(cluster);
          if (!map.hasLayer(regionLayer)) map.addLayer(regionLayer);
        } else {
          if (map.hasLayer(regionLayer)) map.removeLayer(regionLayer);
          if (!map.hasLayer(cluster)) map.addLayer(cluster);
        }
      };
      map.on("zoomend", refreshLayers);

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;

      // Size, frame tight to Saudi, then lock that as the minimum zoom so the
      // map can never pan/zoom out to show neighbouring countries.
      requestAnimationFrame(() => {
        if (cancelled) return;
        map.invalidateSize();
        map.fitBounds(SAUDI_FIT, { padding: [20, 20] });
        map.setMinZoom(map.getZoom());
        refreshLayers();
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
        clusterRef.current = null;
        regionLayerRef.current = null;
        markersByIdRef.current.clear();
        highlightedElRef.current = null;
      }
    };
  }, []);

  // Re-render markers whenever the listings change (or the map becomes ready).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const regionLayer = regionLayerRef.current;
      if (cancelled || !ready || !map || !cluster || !regionLayer) return;

      // --- Price-pin layer (zoomed in) ---
      cluster.clearLayers();
      markersByIdRef.current.clear();
      highlightedElRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers: any[] = [];

      for (const listing of listings) {
        const base = coordsFor(listing);
        if (!base) continue;
        // Precise pins land exactly; only city-center fallbacks are spread out.
        const [jx, jy] = base.precise ? [0, 0] : jitter(listing.id);

        const icon = L.divIcon({
          className: "dar-price-pin",
          html: `<div class="dar-price-pin__pill">${escapeHtml(compactPrice(listing.price))} <span class="icon-saudi_riyal" aria-hidden="true">&#xea;</span></div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          popupAnchor: [0, -14],
        });

        const marker = L.marker([base.lat + jy, base.lng + jx], { icon });
        const href = ROUTES.MARKETPLACE_LISTING(listing.id);
        marker.bindPopup(
          `<div dir="rtl" class="dar-popup">
             <strong class="dar-popup__title">${escapeHtml(listing.title)}</strong>
             <div class="dar-popup__city">${escapeHtml(listing.city || "")}</div>
             <div class="dar-popup__price"><span class="icon-saudi_riyal" aria-hidden="true">&#xea;</span> ${formatNumber(listing.price)} <span class="dar-popup__suffix">${escapeHtml(rentPeriodSuffix(listing.type, listing.rentPeriod))}</span></div>
             <a href="${href}" class="dar-popup__link">عرض التفاصيل</a>
           </div>`,
        );

        // Pin → card sync: report hover upward through the latest callback.
        marker.on("mouseover", () => hoverCbRef.current?.(listing.id));
        marker.on("mouseout", () => hoverCbRef.current?.(null));

        markersByIdRef.current.set(listing.id, marker);
        markers.push(marker);
      }
      cluster.addLayers(markers);

      // --- Region-bubble layer (zoomed out) ---
      regionLayer.clearLayers();
      const counts = new Map<string, number>();
      for (const listing of listings) {
        const rid = regionIdFor(listing);
        if (!rid) continue;
        counts.set(rid, (counts.get(rid) ?? 0) + 1);
      }

      for (const region of SAUDI_REGIONS) {
        const count = counts.get(region.id);
        if (!count) continue;
        const size = count < 10 ? 40 : count < 100 ? 46 : 54;
        const bubble = L.divIcon({
          className: "dar-region",
          html: `<div class="dar-region__bubble" style="width:${size}px;height:${size}px;">
                   <span class="dar-region__name">${escapeHtml(region.ar.replace(/^منطقة\s+|^المنطقة\s+/, ""))}</span>
                   <span class="dar-region__count">${count}</span>
                 </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const m = L.marker([region.lat, region.lng], { icon: bubble });
        m.on("click", () => map.flyTo([region.lat, region.lng], 9, { duration: 0.6 }));
        regionLayer.addLayer(m);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listings, ready]);

  // Card → pin sync: emphasise the hovered listing's pin. If the pin is
  // currently swallowed by a cluster, emphasise that cluster bubble instead.
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!ready || !cluster) return;

    // Clear the previous emphasis first (also handles hoveredId → null).
    styleHighlight(highlightedElRef.current, false);
    highlightedElRef.current = null;

    if (!hoveredId) return;
    const marker = markersByIdRef.current.get(hoveredId);
    if (!marker) return;

    // getVisibleParent returns the marker itself when unclustered, the parent
    // cluster when grouped, or null when the layer isn't on the map (e.g. the
    // region-bubble zoom level) — in that last case there's nothing to light up.
    const visible =
      typeof cluster.getVisibleParent === "function"
        ? cluster.getVisibleParent(marker)
        : marker;
    const el: HTMLElement | null = visible?.getElement?.() ?? null;
    if (!el) return;

    if (typeof visible.setZIndexOffset === "function") {
      visible.setZIndexOffset(1000);
    }
    styleHighlight(el, true);
    highlightedElRef.current = el;

    return () => {
      if (typeof visible.setZIndexOffset === "function") {
        visible.setZIndexOffset(0);
      }
    };
  }, [hoveredId, ready]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", zIndex: 0 }}
      role="application"
      aria-label="خريطة العقارات في المملكة العربية السعودية"
    />
  );
}
