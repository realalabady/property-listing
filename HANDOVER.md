# Project Handover — Property Listing Platform

> Purpose of this file: give a fresh Claude Code session (or a new developer) enough
> context to continue work **without re-exploring the whole codebase**. Read this first.

---

## 1. What this app is

A **multi-tenant real-estate SaaS** for Saudi Arabia. Real-estate **agencies (companies)**
sign up, manage their property **listings**, capture and work **leads** (potential
buyers/renters), assign **tasks** to employees, and track **KPIs**. There is also a
**public marketplace** where customers browse published listings, search, and submit
inquiries that become leads.

- **Audience:** Saudi-first. Default UI language is **Arabic (RTL)**. English dictionary
  exists but `t()` currently reads **only Arabic** (`src/lib/i18n/index.ts`).
- **Tenancy model:** everything a company owns lives under `companies/{companyId}/...`
  in Firestore. Published listings are mirrored to a global `global_listings` collection
  for the public marketplace.

### Tech stack
- **Next.js (App Router)** + React + TypeScript, Tailwind. Windows dev machine.
- **Firebase**: Auth, Firestore, Storage, Cloud Functions (2nd gen, Node.js 20).
- Firebase project id: **`property-listing-7f3db`**.
- Server auth via **session cookies** (`__session`), verified with the Admin SDK.
- Client reads some pages **directly via the Firestore client SDK** (`onSnapshot`),
  others via **Next API routes** backed by the Admin SDK.

### Where things live
- Dashboard pages: `src/app/(company)/dashboard/...`
- Public marketplace: `src/app/(public)/...`
- API routes: `src/app/api/...`
- Feature UI: `src/features/...` (e.g. `features/listings`, `features/leads`, `features/public`)
- Domain types: `src/types/*.ts`
- Constants/enums: `src/constants/*.ts` (roles, permissions, listing categories, routes)
- i18n: `src/lib/i18n/` (Arabic dict at `locales/ar.json`)
- Firebase server init: `src/lib/firebase/admin.ts`; client init: `src/lib/firebase/client.ts`
- Cloud Functions: `functions/src/index.ts`
- **Full DB schema doc:** `db-schema.json` (generated this session — collections, fields,
  relationships, enums; structure only, no data).

---

## 2. Data model (quick reference)

NoSQL/Firestore. `db-schema.json` has the complete version. Key collections:

- `companies/{companyId}` — the tenant. Subcollections:
  `settings/default`, `employees/{uid}`, `permission_groups/{id}`, `invitations/{id}`,
  `listings/{id}`, `leads/{id}`, `tasks/{id}`, `kpi/{current|employees_*}`,
  `kpi_snapshots/{YYYY-MM_uid}`, `notifications/{id}`, `activity_logs/{id}`.
- Top-level: `global_listings/{id}` (published mirror), `lead_requests/{id}` (public
  broadcast requests), `customers/{uid}`, `customer_searches/{id}`, `users/{uid}`,
  `platform_admins/{uid}`, `invitations`, `audit_logs`, `plans`.

The **`Listing`** type (`src/types/listing.ts`) is the richest: title, description, type
(`rent|sale|off_plan`), category, price/currency, location (region/city/district + lat/lng),
`bedrooms`, `bathrooms`, `area`, `amenities` (furnished/parking/pool/…), `details`
(deed/registry block), `contacts[]`, `media[]` (+ `coverImage`), `analytics`, `status`,
`featured`.

---

## 3. What we did this session

### A. Cloud Functions fixes (DEPLOYED to production)
1. **Lead auto-assign strategy actually works now** — `autoAssignLead` in
   `functions/src/index.ts`. Before, it always used round-robin regardless of the setting.
   Now respects `leadAutoAssignStrategy`: `manual` (skip), `least_busy` (rep with fewest
   open leads), `round_robin` (unchanged).
2. **Task escalation was silently broken** — the `escalateOverdueTasks` cron uses a
   **collection-group** query, but the index in `firestore.indexes.json` was scoped
   `COLLECTION` instead of `COLLECTION_GROUP`. Fixed the scope. **Deployed.**
   - Note: an old redundant `COLLECTION`-scoped `tasks(escalated,dueDate)` index still
     exists in Firestore (harmless). Can be removed with
     `firebase deploy --only firestore:indexes --force` (⚠️ `--force` deletes any index
     not in the JSON — only if no other manual indexes were added in console).

### B. Listings UX — cards + detail page + edit (frontend only, NOT yet runtime-verified)
3. **Listings list is now clickable cards** (was a table) —
   `src/features/listings/DashboardListingsClient.tsx`. Cover image, status/featured
   badges, price, etc. Cards have **no action buttons** (by user's choice); clicking a card
   opens the detail page.
4. **New property detail page** — `src/app/(company)/dashboard/listings/[id]/page.tsx`
   + `src/features/listings/DashboardListingDetailClient.tsx`. Shows ALL info + a media
   gallery, and is where actions now live: publish/draft, feature, delete, **and full media
   management** (upload / set cover / remove). New route helper
   `ROUTES.DASHBOARD_LISTING_DETAIL`.
5. **Create form: added the practical fields** that were missing —
   `src/features/listings/NewListingForm.tsx`. Added a "Unit specs & amenities" section:
   **bedrooms, bathrooms, parking, year built** + amenity checkboxes (furnished, AC,
   elevator, balcony, garden, pool, gym, security, heating, pet-friendly). Previously the
   form wrote `amenities: {}` and never captured bedrooms/bathrooms.
6. **Made those fields constrained dropdowns** (not free text) to reduce human error and
   enable clean search/matching: bedrooms/bathrooms/parking are numeric selects (capped,
   e.g. "10+"), year is a year dropdown.
7. **Edit form now works** — the placeholder `[id]/edit/page.tsx` is replaced. Instead of
   duplicating ~1000 lines, `NewListingForm` was made **mode-aware** (`mode="create"|"edit"`,
   `listingId`). Edit loads the listing, pre-fills everything (incl. reverse-mapping stored
   Arabic region/city/district names back into the cascading select IDs), and `updateDoc`s.
   Preserves media/analytics/featured/createdAt; stamps `publishedAt` only on first publish.
8. **Marketplace search** — `src/features/public/MarketplaceClient.tsx`: the "min bedrooms"
   filter is now a dropdown matching the form's options (type/category/region/city/district
   were already constrained).

### C. Bug fixes from a Playwright test pass
9. **Customer signup left orphans** — `src/app/api/customer/signup/route.ts`. If
   `createCustomToken` failed, the route had already created the Auth user + `customers/{uid}`
   doc → retries hit 409. **Fixed:** on any post-create failure it now rolls back (deletes
   the user + doc). `createdUid` is only set after our `createUser`, so we never delete an
   account that already belonged to someone else.
10. **Listings "session expired" false flash** — `DashboardListingsClient.tsx`. Right after
    login `authUser` is briefly null during auth restore; the page showed a scary red
    "session expired" banner instantly. **Fixed:** added a 2.5s grace timer — only show the
    banner if still no user after the delay (the effect re-runs and clears the timer when
    `authUser` arrives).

### Verification status of this session's code
- **`npx tsc --noEmit` passes clean** for everything (run via PowerShell — see gotchas).
- **NOT runtime-verified** in a browser: the listings cards/detail/edit flow and the two
  bug fixes were not exercised live (no test login available in-session). Needs manual or
  Playwright verification.

---

## 4. Open / pending items

1. **REQUIRED secret you must add — signup 500 + perceived slowness.**
   `.env.local` has **empty** `ADMIN_CLIENT_EMAIL` and `ADMIN_PRIVATE_KEY`. Without them the
   Admin SDK falls back to ADC, which **cannot sign custom tokens locally** → customer
   signup returns 500. Fix:
   - Firebase Console → Project Settings → Service accounts → "Generate new private key".
   - Put `client_email` → `ADMIN_CLIENT_EMAIL`, `private_key` → `ADMIN_PRIVATE_KEY`
     (keep `\n` literals, wrap key in double quotes). `admin.ts` normalizes `\n`.
   - Restart dev. Then `cert()` is used and signing works.
   - Clean up any orphan test users created by earlier failed signups (Auth + `customers/{uid}`).

2. **Slowness (Leads/Listings ~3-4s) — DIAGNOSED, not yet fixed.** Most likely cause is
   **`npm run dev` route compilation** (Next compiles on first hit; the Firebase client SDK
   is large). Cheapest disambiguation: `npm run build && npm run start`, then open the pages
   — if fast, it was dev compile, not a real bug. If still slow in prod, the real win is to
   **SSR initial data**: read listings/leads with the Admin SDK in the server component
   (already authed via cookie) and hand the client `initialRows` so it paints instantly,
   then attach the live `onSnapshot` for updates. This removes the "hydrate → auth restore →
   snapshot → paint" serial wait. This work was **not started**.

3. **Edit page is the only edit path** — `[id]/edit` reuses `NewListingForm` in edit mode.
   Fine, but not browser-tested yet.

4. **Optional:** remove the redundant Firestore `tasks` index (see §3.2).

---

## 5. Environment gotchas (IMPORTANT — these wasted time)

- **Windows + Git Bash breaks some tooling.** Running `npx tsc`, `firebase deploy`, etc.
  through the **Bash tool** fails with `'"node"' is not recognized` (a child-process PATH/
  quoting issue). **Run these via PowerShell instead**, where `node` is on PATH
  (`C:\Program Files\nodejs\node.exe`). Example that works:
  `Set-Location 'E:\Desktop\web\react\sell\listingProperty'; npx tsc --noEmit`.
- **C: drive is ~full (≈1 GB free).** `firebase deploy` packages functions into the system
  temp dir on C: and crashes with an "unexpected error" when C: is full. **Workaround that
  worked:** redirect temp to the E: drive (27 GB free) before deploying:
  `$env:TEMP='E:\firebase-tmp'; $env:TMP='E:\firebase-tmp'; firebase deploy --only functions`.
- **No ESLint config exists** — `npm run lint` (`next lint`) just drops into an interactive
  setup prompt. Don't rely on it; use `tsc --noEmit` as the gate.
- **Firebase login** is currently valid (`fakealabady@gmail.com`). If a deploy says
  credentials invalid, `firebase login --reauth` is interactive (browser) — the user must
  run it; an agent cannot.
- **Functions runtime is Node.js 20**, deprecated, decommissioned **2026-10-30**. Upgrade
  before then. `firebase-functions` is also outdated. Non-blocking today.
- **i18n:** add new UI strings to `src/lib/i18n/locales/ar.json` only (`t()` reads Arabic).

---

## 6. Useful commands

```powershell
# from project root, in PowerShell
Set-Location 'E:\Desktop\web\react\sell\listingProperty'

npx tsc --noEmit                 # type-check gate
npm run dev                      # dev server (slow first compile per route)
npm run build; npm run start     # prod build — use to test real page speed

# deploy (temp redirected to E: to survive full C:)
$env:TEMP='E:\firebase-tmp'; $env:TMP='E:\firebase-tmp'
firebase deploy --only functions
firebase deploy --only firestore:indexes
firebase firestore:indexes       # inspect deployed indexes
```

---

## 7. Files touched this session (for quick orientation)

- `functions/src/index.ts` — autoAssignLead strategy logic
- `firestore.indexes.json` — tasks index scope → COLLECTION_GROUP
- `src/constants/routes.ts` — added DASHBOARD_LISTING_DETAIL
- `src/features/listings/DashboardListingsClient.tsx` — table → cards; session-expired grace
- `src/features/listings/DashboardListingDetailClient.tsx` — NEW detail/gallery/actions
- `src/features/listings/NewListingForm.tsx` — specs+amenities, dropdowns, edit mode
- `src/app/(company)/dashboard/listings/[id]/page.tsx` — NEW detail route
- `src/app/(company)/dashboard/listings/[id]/edit/page.tsx` — real edit page
- `src/app/(company)/dashboard/listings/page.tsx` — simplified props
- `src/features/public/MarketplaceClient.tsx` — bedrooms dropdown
- `src/app/api/customer/signup/route.ts` — rollback orphans
- `src/lib/i18n/locales/ar.json` — new listing detail labels
- `db-schema.json` — NEW full schema doc for analysts
```
