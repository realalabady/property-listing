# Handover — Multi-Unit "View Units" Popup (Note 6 continued)

**Date:** 2026-07-18
**Status:** ⚠️ Code complete but **UNVERIFIED** — `npx tsc --noEmit` could NOT be
run in the last session (the harness's command-approval classifier was
temporarily down, a Claude-side outage — nothing to do with the code). Verify
before trusting.

---

## The user's request (verbatim intent)

On the **public property detail page**, a multi-unit building shows a small box:

> **1 وحدة متاحة**
> تبدأ الأسعار من 33,000 ريال

The user wants that box to be **clickable**, opening a **popup** that shows the
full details of every additional/available unit **including any uploaded
images**.

## The bug the user hit

The box said **"1 وحدة متاحة"** but the popup opened to **"0 وحدة متاحة / لا
توجد وحدات متاحة"**, and after a "fix" it became **unclickable entirely**. Both
are wrong — the user wants it clickable AND populated.

---

## Root cause (important — understand this before changing anything)

The count and the details are **two different denormalized fields** on the
listing doc `companies/{cid}/listings/{lid}`:

| UI element | Field on listing doc | Written when |
|---|---|---|
| "1 وحدة متاحة" + price range | `unitsSummary` | a unit is saved |
| Popup contents (specs + images) | `publicUnits[]` | a unit is saved |

`publicUnits` was **added after** the user's existing unit was already saved, so
that unit's doc simply never had `publicUnits` written. Result: summary count
exists (1) but the details array is empty (0).

### Why the public page CAN read this safely
- The **units subcollection** (`.../listings/{lid}/units/{unitId}`) is
  **internal only** (firestore.rules: company members) because units hold
  tenant/buyer name + phone. A public visitor reading it = "Missing or
  insufficient permissions".
- So we denormalize a **sanitized, tenant-free** `publicUnits[]` array onto the
  listing doc itself. Published listing docs are world-readable per
  firestore.rules, and the public detail page **already loads the source
  listing doc** (for the photo gallery), so `publicUnits` rides along on a read
  that already happens — no extra fetch, no dependency on the Cloud Function
  mirror.
- `publicUnits` is tenant-free **by construction** (the tenant/buyer block is
  never written into it), not filtered at render time.

---

## What was implemented (files touched)

### Types — `src/types/listing.ts`
- `PublicListingUnit` interface (id, label, type, price, rentPeriod, area,
  bedrooms, bathrooms, livingRooms, kitchens, majlis, floor, furnished,
  description, images[]). **No tenant field — deliberate.**
- `ListingUnit` gained: `livingRooms`, `kitchens`, `majlis`, `floor`,
  `furnished`, `images[]`, `imagePaths[]`.
- `Listing` gained: `publicUnits?: PublicListingUnit[]`.
- `ListingUnitsSummary` gained spec ranges (bedroomsMin/Max, areaMin/Max,
  livingRoomsMax, anyFurnished).

### Units manager — `src/features/listings/ListingUnitsManager.tsx`
- Per-unit **image upload** (up to `MAX_IMAGES_PER_UNIT = 6`) to Storage path
  `companies/{cid}/listings/{lid}/units/...` (covered by existing Storage
  rules; SVG rejected). Thumbnails + remove buttons in the form.
- New strict dropdown fields: living rooms, majlis, kitchens, floor, furnished.
- `recomputeSummary()` now ALSO builds `publicUnits[]` (available units only,
  capped at `MAX_PUBLIC_UNITS = 40`) and writes it onto the listing doc
  alongside `unitsSummary`.
- **Self-heal effect** (the key fix): new prop `publicUnitsCount?: number`.
  On mount, if `canEdit && !loading` and the stored `publicUnitsCount` disagrees
  with the live `summary.available`, it calls `recomputeSummary()` once
  (guarded by `healedRef`). This repairs listings whose units predate
  `publicUnits` **without anyone re-saving units by hand** — an editor just
  opening the listing page fixes it.

### Dashboard detail — `src/features/listings/DashboardListingDetailClient.tsx`
- `ListingDetail` gained `publicUnitsCount: number` (from
  `data.publicUnits.length`), passed into `<ListingUnitsManager
  publicUnitsCount={...} />`.

### Public data — `src/features/public/data.ts`
- `PublicListing` gained `units: PublicListingUnit[]` + the spec-range fields.
- `parsePublicUnits()` helper; `mapPublicListing()` populates `units` from
  `data.publicUnits`.

### Public popup — `src/features/public/UnitsDialog.tsx` (NEW)
- Modal: lists each available unit with label, price (+rent period), spec line,
  description, and a photo thumbnail grid with a full-size **lightbox**.
- Closes on ✕ / backdrop / Esc; locks body scroll; bottom-sheet on mobile,
  centered dialog on desktop.

### Public detail — `src/features/public/MarketplaceDetailClient.tsx`
- The units box: clickable `<button>` opening `<UnitsDialog>` **only when
  `listing.units.length > 0`**; otherwise renders as a plain (non-clickable)
  info box so there's never a dead-end empty popup.
- Added `unitsOpen` state + `<UnitsDialog>` render.

### Card — `src/features/public/ListingCard.tsx`
- Multi-unit cards show available-unit spec ranges + "from" price instead of the
  parent's own specs.

### Mirror sync (for the global marketplace list, not the detail page)
- `functions/src/index.ts` and
  `src/app/api/companies/[companyId]/listings/[listingId]/status/route.ts`:
  both now copy `publicUnits` (and `unitsSummary`) onto the global mirror.

### i18n — `src/lib/i18n/locales/ar.json`
- `units.*`: images, imagesHint, imageUploadFailed, tooManyImages, dialogTitle,
  noneAvailable, unitFallback, bedroomsCount, bathroomsCount, majlisCount,
  kitchensCount, floorNumber, livingRooms, majlis, kitchens, floor, furnished,
  groundFloor, furnishedShort, etc.
- `marketplace.*`: viewUnits, living, furnished, priceFrom, unitsPriceRange,
  unitsPriceFrom, unitsAvailable.

---

## ‼️ NEXT SESSION — do these first

1. **Run the type-checks** (these were NOT run last session):
   ```powershell
   npx tsc --noEmit                    # app
   cd functions; npx tsc --noEmit; cd ..   # cloud functions
   ```
   Fix anything that surfaces. Likely-clean but unverified.

2. **Manual test the self-heal + popup:**
   - Open the affected listing ("vilas" / company "Elite") in the **dashboard**
     detail page as an editor. The self-heal effect should recompute and write
     `publicUnits` automatically.
   - Reload the **public** property page. The box should now be **clickable**
     and the popup should list the unit with its specs.
   - Add 1–2 photos to the unit (dashboard) → they must appear in the popup grid
     + lightbox.
   - Gotcha: public visibility requires the listing `status === "published"`
     (that's what makes the source doc world-readable).

3. **Verify no tenant leak:** confirm `publicUnits` on the listing doc contains
   NO tenant/buyer name or phone (check Firestore console or log it).

---

## Deploy status

**NOTHING is deployed.** The user explicitly wants **one single deploy at the
very end** covering all of Phase 1 + 2 + 3. Do not deploy piecemeal without
asking. When ready, the one command is:
```powershell
Remove-Item .firebase\hosting.*.cache -Force -ErrorAction SilentlyContinue
firebase deploy
```
(covers hosting + firestore rules + storage rules + functions).

### Deploy dependency note
- The **public detail popup does NOT need the functions deploy** — it reads
  `publicUnits` from the source listing doc directly.
- The **global marketplace *list*/*card*** unit ranges DO depend on the mirror,
  which only refreshes via the Cloud Function (`functions/src/index.ts`) or the
  status route re-publish. So card ranges appear after deploy + a re-publish.

---

## Context / working agreements
- App auth screens + listing UI are **Arabic-only** (ar.json is the source;
  en.json often lacks these keys — that's the existing pattern, not a bug).
- **Node is not on the Git-Bash PATH** on this machine — run `npx`, `tsc`,
  `firebase`, `npm` via **PowerShell**, not the Bash tool.
- A **concurrent editor/session** has been modifying the same files (added a
  Google-Maps pin-picker: `mapUrl`, `mapLat/mapLng`, `preciseLocation`). Review
  `git diff` before committing — you may be shipping their in-progress work too.
- All 10 client feedback notes (Phases 1–3) are otherwise implemented; see
  `C:\Users\fakea\.claude\plans\now-i-gave-an-tender-popcorn.md` for the full
  roadmap.
