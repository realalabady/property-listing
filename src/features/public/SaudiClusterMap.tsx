"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  resolveCoordsByName,
  SAUDI_MAP_CENTER,
  SAUDI_MAP_ZOOM,
} from "@/constants/saudi-regions";
import { ROUTES } from "@/constants/routes";
import { formatNumber } from "@/lib/utils/format";
import { rentPeriodSuffix } from "./filters";
import type { PublicListing } from "./data";

interface SaudiClusterMapProps {
  listings: PublicListing[];
  className?: string;
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

function coordsFor(listing: PublicListing): { lat: number; lng: number } | null {
  if (listing.lat != null && listing.lng != null) {
    return { lat: listing.lat, lng: listing.lng };
  }
  return resolveCoordsByName(listing.region, listing.city, listing.district);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function SaudiClusterMap({
  listings,
  className,
}: SaudiClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusterRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.markercluster");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: true,
      }).setView([SAUDI_MAP_CENTER.lat, SAUDI_MAP_CENTER.lng], SAUDI_MAP_ZOOM);

      // Remove Leaflet's default "Leaflet 🇺🇦" prefix (the Ukraine flag).
      map.attributionControl.setPrefix(false);

      // Modern, clean basemap served from a reliable CDN with retina support.
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount();
          const size = count < 10 ? 36 : count < 100 ? 44 : 52;
          return L.divIcon({
            html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:hsl(158 64% 30%);color:#fff;font-size:13px;font-weight:700;border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.25);">${count}</div>`,
            className: "",
            iconSize: [size, size],
          });
        },
      });
      map.addLayer(cluster);

      mapRef.current = map;
      clusterRef.current = cluster;

      // Container may size after init (flex/grid); ensure tiles render.
      requestAnimationFrame(() => map.invalidateSize());
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
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
      }
    };
  }, []);

  // Re-render markers whenever the listings change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const cluster = clusterRef.current;
      if (cancelled || !cluster) return;

      cluster.clearLayers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers: any[] = [];

      for (const listing of listings) {
        const base = coordsFor(listing);
        if (!base) continue;
        const [jx, jy] = jitter(listing.id);

        const icon = L.divIcon({
          className: "dar-pin",
          html: `<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(15,23,42,.3));">
              <path d="M17 0C7.61 0 0 7.61 0 17c0 11.9 15.3 24 16 24.6.7-.6 16-12.7 16-24.6C32 7.61 24.39 0 17 0Z" fill="hsl(158 64% 30%)" stroke="#fff" stroke-width="2.5"/>
              <circle cx="17" cy="17" r="6" fill="#fff"/>
            </svg>`,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -40],
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
        markers.push(marker);
      }

      cluster.addLayers(markers);
    })();

    return () => {
      cancelled = true;
    };
  }, [listings]);

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
