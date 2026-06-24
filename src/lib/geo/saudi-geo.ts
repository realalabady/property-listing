/**
 * Loader for the official Saudi National Address geography dataset
 * (regions → cities → districts), sourced from
 * https://github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts
 * (data from maps.address.gov.sa). The JSON lives in /public/geo and is
 * fetched + cached on demand so it never bloats page bundles.
 *
 * District coordinates aren't in the lite dataset, so the map pin uses the
 * parent city's center — accurate enough for clustering while keeping the
 * full, correct district names in the cascading selects.
 */

export interface GeoRegion {
  region_id: number;
  name_ar: string;
  name_en: string;
}

export interface GeoCity {
  city_id: number;
  region_id: number;
  name_ar: string;
  name_en: string;
  center: [number, number]; // [lat, lng]
}

export interface GeoDistrict {
  district_id: number;
  city_id: number;
  region_id: number;
  name_ar: string;
  name_en: string;
}

let regionsCache: Promise<GeoRegion[]> | null = null;
let citiesCache: Promise<GeoCity[]> | null = null;
let districtsCache: Promise<GeoDistrict[]> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return (await res.json()) as T;
}

export function loadRegions(): Promise<GeoRegion[]> {
  if (!regionsCache) regionsCache = fetchJson<GeoRegion[]>("/geo/regions.json");
  return regionsCache;
}

export function loadCities(): Promise<GeoCity[]> {
  if (!citiesCache) citiesCache = fetchJson<GeoCity[]>("/geo/cities.json");
  return citiesCache;
}

export function loadDistricts(): Promise<GeoDistrict[]> {
  if (!districtsCache)
    districtsCache = fetchJson<GeoDistrict[]>("/geo/districts.json");
  return districtsCache;
}
