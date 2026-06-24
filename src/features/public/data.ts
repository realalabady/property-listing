import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  LISTING_CATEGORIES,
  LISTING_TYPES,
  type ListingCategory,
  type ListingType,
} from "@/constants/listing-categories";

export interface PublicCompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface PublicCompany {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  whatsapp: string;
  phone: string;
  email: string;
  theme: PublicCompanyTheme;
}

export interface PublicListing {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  title: string;
  type: ListingType;
  category: ListingCategory;
  rentPeriod: string | null;
  city: string;
  region: string;
  district: string;
  lat: number | null;
  lng: number | null;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  coverImage: string;
  featured: boolean;
}

export function mapPublicListing(
  id: string,
  data: DocumentData,
): PublicListing {
  const type = (data.type as ListingType) ?? LISTING_TYPES.SALE;
  const category =
    (data.category as ListingCategory) ?? LISTING_CATEGORIES.APARTMENT;
  return {
    id,
    companyId: typeof data.companyId === "string" ? data.companyId : "",
    companyName:
      typeof data.companyName === "string"
        ? data.companyName
        : "Real estate company",
    companySlug: typeof data.companySlug === "string" ? data.companySlug : "",
    title: typeof data.title === "string" ? data.title : "Untitled property",
    type,
    category,
    rentPeriod: typeof data.rentPeriod === "string" ? data.rentPeriod : null,
    city:
      typeof data.city === "string"
        ? data.city
        : typeof data.location?.city === "string"
          ? (data.location.city as string)
          : "",
    region:
      typeof data.region === "string"
        ? data.region
        : typeof data.location?.region === "string"
          ? (data.location.region as string)
          : "",
    district:
      typeof data.district === "string"
        ? data.district
        : typeof data.location?.district === "string"
          ? (data.location.district as string)
          : "",
    lat:
      typeof data.lat === "number"
        ? data.lat
        : typeof data.location?.lat === "number"
          ? (data.location.lat as number)
          : null,
    lng:
      typeof data.lng === "number"
        ? data.lng
        : typeof data.location?.lng === "number"
          ? (data.location.lng as number)
          : null,
    price: typeof data.price === "number" ? data.price : 0,
    currency: typeof data.currency === "string" ? data.currency : "SAR",
    bedrooms: typeof data.bedrooms === "number" ? data.bedrooms : 0,
    bathrooms: typeof data.bathrooms === "number" ? data.bathrooms : 0,
    area: typeof data.area === "number" ? data.area : 0,
    coverImage:
      typeof data.coverImage === "string" && data.coverImage.length > 0
        ? data.coverImage
        : "",
    featured: Boolean(data.featured),
  };
}

export async function getCompanyBySlug(
  slug: string,
): Promise<PublicCompany | null> {
  const db = getFirebaseDb();
  const companiesRef = collection(db, "companies");
  const q = query(companiesRef, where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const first = snap.docs[0]!;
  const data = first.data();

  const theme =
    typeof data.theme === "object" && data.theme !== null
      ? (data.theme as Record<string, unknown>)
      : {};

  return {
    id: first.id,
    slug,
    name: typeof data.name === "string" ? data.name : "Company",
    description:
      typeof data.description === "string"
        ? data.description
        : "Real estate team focused on premium service.",
    logo: typeof data.logo === "string" ? data.logo : "",
    whatsapp:
      typeof data.contact?.whatsapp === "string" ? data.contact.whatsapp : "",
    phone: typeof data.contact?.phone === "string" ? data.contact.phone : "",
    email: typeof data.contact?.email === "string" ? data.contact.email : "",
    theme: {
      primaryColor:
        typeof theme.primaryColor === "string" ? theme.primaryColor : "#0f6d45",
      secondaryColor:
        typeof theme.secondaryColor === "string"
          ? theme.secondaryColor
          : "#e8d9bf",
      accentColor:
        typeof theme.accentColor === "string" ? theme.accentColor : "#11935d",
    },
  };
}

export async function getPublicCompanyListings(
  companyId: string,
): Promise<PublicListing[]> {
  const db = getFirebaseDb();
  const listingsRef = collection(db, `companies/${companyId}/listings`);
  const q = query(listingsRef, where("status", "==", "published"), limit(24));

  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapPublicListing(d.id, {
      ...d.data(),
      companyId,
      companyName: d.data().companyName,
      companySlug: d.data().companySlug,
      city: d.data().location?.city,
    }),
  );
}

export async function getCompanyListingById(
  companyId: string,
  listingId: string,
): Promise<PublicListing | null> {
  const db = getFirebaseDb();
  const ref = doc(db, `companies/${companyId}/listings/${listingId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.status !== "published") return null;

  return mapPublicListing(snap.id, {
    ...data,
    companyId,
    city: data.location?.city,
  });
}

export async function getGlobalListings(): Promise<PublicListing[]> {
  const db = getFirebaseDb();
  const globalRef = collection(db, "global_listings");
  const q = query(globalRef, orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPublicListing(d.id, d.data()));
}

export async function getGlobalListingById(
  id: string,
): Promise<PublicListing | null> {
  const db = getFirebaseDb();
  const ref = doc(db, `global_listings/${id}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapPublicListing(snap.id, snap.data());
}
