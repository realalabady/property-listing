# CRM Growth Roadmap — Implementation Spec for Opus 4.8

> **Audience:** a future Claude (Opus 4.8) session tasked with building these features.
> **Status:** §1.0 prerequisites and FEATURE 1 (Kanban pipeline) are IMPLEMENTED (2026-07-07).
> Implementation notes vs. this spec: stages live at `companies/{cid}/pipeline_stages/{key}`
> (doc id == key) and are LAZY-SEEDED on first board/stages API access instead of at company
> creation; each stage carries a `legacyStatus` mirrored onto `lead.status` on every move;
> `assertActiveMember` lives in `src/lib/api/guards.ts` and is wired into leads/listings/pipeline
> mutations; the listings quota is transactional against `listingsCount` with a self-healing
> `syncListingsCount` trigger; `flagStuckDeals` runs every 6h using
> `settings/default.pipelineStuckHours` (default 72). Board UI: `src/features/pipeline/`.
> FEATURES 2 (WhatsApp) and 3 (credit marketplace) are still design-only.
> **Author context:** written after a full read-only pass of the repo. All paths, helper
> names, and conventions below are real and verified against the current code.

This document teaches you (a) the layered architecture every feature in this app follows —
**from Firestore up to the end-user browser** — and then (b) three features to build, each
with data model, security rules, API routes, Cloud Functions, and UI, in dependency order.

---

## 0. READ THIS FIRST — how a feature is structured in this app (DB → browser)

Every feature is built in the **same 8 layers**. Build them bottom-up. Never skip the rules
layer — a route that writes to a collection the client can also reach directly is a tenant-leak
waiting to happen.

```
┌─────────────────────────────────────────────────────────────────┐
│ 8. UI/UX polish       framer-motion, RTL, ⌘K, optimistic updates │
│ 7. Client components  "use client" — React, hooks, SWR/fetch     │
│ 6. Server components  RSC data fetch via requireCompanyMember()  │
│ 5. Shared constants   src/constants/*  +  src/types/*  (en/ar)   │
│ 4. API route handlers src/app/api/**/route.ts  (Admin SDK)       │
│ 3. Cloud Functions    functions/src/index.ts  (triggers, crons)  │
│ 2. Security rules      firestore.rules  +  storage.rules         │
│ 1. Firestore data model  companies/{cid}/<subcollection>/{id}    │
└─────────────────────────────────────────────────────────────────┘
```

### The conventions you MUST match (verified in the codebase)

**Layer 1 — Data model.** Everything company-owned lives under `companies/{companyId}/<sub>/{id}`.
Tenant isolation is by path. Denormalize counters onto the company doc when you need cheap reads
(`listingsCount`, `activeEmployeesCount` already exist). Timestamps are `FieldValue.serverTimestamp()`.

**Layer 2 — Security rules** (`firestore.rules`). Helpers already defined at the top:
`isSignedIn()`, `isSuperAdmin()`, `isCompanyMember(cid)`, `hasPermission(perm)`. The pattern for a
company subcollection:
```
match /companies/{cid}/<sub>/{id} {
  allow read:   if isSuperAdmin() || (isCompanyMember(cid) && hasPermission('<view_perm>'));
  allow create: if false;   // ← if the collection is API-only, DENY client writes
  allow update: if isSuperAdmin() || (isCompanyMember(cid) && hasPermission('<edit_perm>')
                   && request.resource.data.companyId == cid);
}
```
**Rule of thumb used across this app:** if validation/quota/uniqueness must be enforced, set
`allow create: if false` and make the API route (Admin SDK, which bypasses rules) the ONLY writer.
This is already done for `listings`, `leads`, `lead_requests`, `customer_searches`.

**Layer 3 — Cloud Functions** (`functions/src/index.ts`, Gen 2, `us-central1`). Used for:
claim sync (`syncEmployeeClaims`), denormalization (`syncGlobalListing`), KPI recompute
(`recomputeCompanyKpi`), scheduled jobs (`escalateOverdueTasks`, `expireTrials`). Triggers:
`onDocumentCreated`, `onDocumentWritten`, `onSchedule`. **Reads must precede writes inside a
transaction.** There is already a `ROLE_PERMISSIONS` map duplicated here — keep it in sync with
`src/constants/permissions.ts` when you add permissions.

**Layer 4 — API routes.** Every `route.ts` starts with:
```ts
export const runtime = "nodejs";           // firebase-admin is not Edge-compatible
interface RouteContext { params: Promise<{ companyId: string }>; }
```
The auth preamble, copy it verbatim:
```ts
const { companyId } = await context.params;
const user = await getSessionUser();
if (!user) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
if (!canDoTheThing(user, companyId))
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
```
`getSessionUser()` → `{ uid, email, role, companyId, permissions[] } | null`. Authorization is
`user.role === ROLES.SUPER_ADMIN || (user.companyId === companyId && hasAnyPermission(user.permissions, [...]))`.
**Never trust `companyId`/`role` from the request body — only from the session claims.**

> ⚠️ **Prerequisite bugs to fix first (from the security review):** API routes currently do NOT
> re-check `employee.active` or company `status` (suspended/trial-expired), and quota checks are
> non-atomic. See §1.0 — build the shared guard + transactional counter helper BEFORE these
> features, because all three depend on them.

**Layer 5 — Constants & types.** Enums live in `src/constants/` as `{ KEY: "value" }` objects with a
matching `*_LABELS: Record<T, {en: string; ar: string}>`. Types in `src/types/`. Permissions in
`src/constants/permissions.ts` (add to both `PERMISSIONS` and the relevant roles in `ROLE_PERMISSIONS`,
**and** the mirror map in `functions/src/index.ts`).

**Layer 6 — Server components.** Protected pages call `await requireCompanyMember()` (from
`src/lib/auth/guards.ts`) at the top; it redirects suspended/inactive users. Fetch initial data
server-side with the Admin SDK and pass as props to a client component.

**Layer 7 — Client components.** `"use client"`; permission-gate UI with a `usePermission('...')`
hook (client mirror of the claim). Mutations go through the `/api/...` routes via `fetch`, never
direct Firestore writes for anything the rules deny.

**Layer 8 — UX.** Bilingual/RTL first (Arabic is primary market). Optimistic updates for
drag-drop. `framer-motion` for transitions. A `⌘K` command palette is a stated goal.

---

## 1.0 PREREQUISITE — shared guards & atomic counters (do this first)

These unblock all three features and fix review findings #1, #2, #3, #5.

### 1.0.a API-side live membership + company-active guard
Create `src/lib/api/guards.ts`:
```ts
import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/constants/roles";
import type { SessionUser } from "@/lib/auth/session";

/** Re-validate against Firestore what the cookie can't be trusted for:
 *  the employee is still active AND the company is still usable. */
export async function assertActiveMember(
  user: SessionUser,
  companyId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (user.role === ROLES.SUPER_ADMIN) return { ok: true };
  if (user.companyId !== companyId)
    return { ok: false, status: 403, error: "Forbidden." };

  const [companySnap, empSnap] = await Promise.all([
    adminDb().doc(`companies/${companyId}`).get(),
    adminDb().doc(`companies/${companyId}/employees/${user.uid}`).get(),
  ]);
  const c = companySnap.data() ?? {};
  const blocked = c.status === "suspended" || c.status === "cancelled" || c.isDeleted === true;
  if (!companySnap.exists || blocked)
    return { ok: false, status: 403, error: "Company is not active." };
  if (!empSnap.exists || empSnap.get("active") === false)
    return { ok: false, status: 403, error: "Account is not active." };
  return { ok: true };
}
```
Call it in every mutating company-scoped route after the permission check.

### 1.0.b Transactional counter helper (fixes quota races)
Maintain counters on the company doc and mutate them inside the same transaction as the create:
```ts
// inside adminDb().runTransaction(async (tx) => { ... })
const companyRef = adminDb().doc(`companies/${companyId}`);
const snap = await tx.get(companyRef);                 // READ first
const current = (snap.get("listingsCount") as number) ?? 0;
if (!isUnlimited(max) && current >= max) throw new QuotaError(max);
tx.set(newDocRef, {...});                                // WRITE
tx.update(companyRef, { listingsCount: FieldValue.increment(1) });
```
Aggregate `.count()` cannot run inside a transaction — that's why we keep an incremented counter.
Backfill counters once with a one-off script.

---

## FEATURE 1 — Kanban Sales Pipeline (build first: pure reuse, huge perceived value)

Turns the flat lead list into a drag-and-drop deal board. Reuses `leads`, their `status`,
`activity` subcollection, and the existing KPI recompute.

### 1.1 Data model
Leads already have `status ∈ {new, contacted, qualified, deal, lost}`. To support a **Kanban board**
you need per-company customizable stages and ordering. Two additions:

**A. Configurable stages** — `companies/{cid}/pipeline_stages/{stageId}`:
```
{
  companyId: string,
  key: string,            // stable machine key, e.g. "viewing_scheduled"
  labelEn: string, labelAr: string,
  color: string,          // hex, for the column header
  order: number,          // 0-based column position
  isTerminal: boolean,    // true for won/lost — excludes from "open" counts
  wonStage: boolean,      // exactly one; drives revenue/conversion KPIs
  active: boolean,
  createdAt, updatedAt
}
```
Seed the 5 existing `LEAD_STATUSES` as default stages on company creation so old leads map cleanly.
Keep the legacy `status` string on the lead in sync with `stageKey` for backward compatibility with
the KPI functions (which query `status == "deal"`).

**B. Lead board fields** — add to each lead doc:
```
stageKey: string,          // mirrors a pipeline_stages.key
boardOrder: number,        // fractional index for ordering within a column (see 1.5)
stageEnteredAt: Timestamp,  // for "time in stage" / stuck-deal alerts
estimatedValue: number|null, // deal size for pipeline-value forecasting
expectedCloseAt: Timestamp|null,
```

### 1.2 Constants (Layer 5)
`src/constants/pipeline.ts` — export `DEFAULT_PIPELINE_STAGES` (array mirroring `LEAD_STATUSES` with
en/ar labels + colors). Add permission `MANAGE_PIPELINE: "manage_pipeline"` to `permissions.ts`
(grant to owner/admin/manager) **and** the mirror in `functions/src/index.ts`.

### 1.3 Security rules (Layer 2)
```
match /companies/{cid}/pipeline_stages/{stageId} {
  allow read:   if isSuperAdmin() || isCompanyMember(cid);
  allow create, update, delete:
                if isSuperAdmin() || (isCompanyMember(cid) && hasPermission('manage_pipeline')
                   && request.resource.data.companyId == cid);
}
```
Leads stay API-only (`allow create: if false`). The **stage move** is a lead `update`; the existing
lead update rule already requires `manage_leads` + `companyId == cid` + immutable `createdAt`. Add
a guard so `view_own_leads`-only users can only move leads assigned to them (mirror the read rule).

### 1.4 API routes (Layer 4)
- `GET/POST/PUT/DELETE /api/companies/[companyId]/pipeline/stages` — CRUD stages (perm `manage_pipeline`).
  On reorder, write all `order` fields in a batch. Refuse deleting a stage that still has leads
  (or require a `moveToStageKey` param to reassign them first).
- `PATCH /api/companies/[companyId]/leads/[leadId]/stage` — the drag-drop endpoint. Body:
  `{ stageKey, boardOrder, estimatedValue?, expectedCloseAt? }`. Steps:
  1. auth + `assertActiveMember` + `manage_leads` (or `view_own_leads` && lead.assignedTo === uid)
  2. validate `stageKey` exists in `pipeline_stages`
  3. in a transaction: set `stageKey`, `boardOrder`, `stageEnteredAt = serverTimestamp()`, and mirror
     the legacy `status` if the stage maps to a legacy status; if `wonStage`, set `status = "deal"`.
  4. append an `activity` doc (`type: "stage_changed"`, from/to) — reuse the existing pattern from
     `leads/route.ts`.
- `GET /api/companies/[companyId]/pipeline/board?assignedTo=` — returns leads grouped by `stageKey`,
  ordered by `boardOrder`, capped per column (e.g. 50, with "load more"). Respects the same
  own-vs-all visibility logic already in `leads/route.ts` GET.

### 1.5 Ordering trick (avoid renumbering every card)
Use **fractional indexing** for `boardOrder`: to drop a card between neighbors with orders `a` and
`b`, set `boardOrder = (a + b) / 2`. Only touches one document per move. Periodically normalize if
precision degrades. This keeps drag-drop O(1) writes.

### 1.6 Cloud Function
Add `onLeadWriteRefreshKpi` already recomputes KPI on any lead write — good, stage moves are covered.
Add a scheduled `flagStuckDeals` (every 6h): leads whose `stageEnteredAt` older than a company-set
threshold and stage is non-terminal → create a `notifications` doc (`type: "deal_stuck"`). Reuse the
notification + email fan-out already wired for task escalation.

### 1.7 Server + client (Layers 6–7)
- RSC page `src/app/(dashboard)/dashboard/pipeline/page.tsx`: `await requireCompanyMember()`, fetch
  stages + board server-side, pass to a `"use client"` `<PipelineBoard>`.
- `<PipelineBoard>`: use `@dnd-kit/core` (accessible, RTL-aware) for drag-drop. On drop → optimistic
  local move → `PATCH .../stage` → reconcile. Column header shows count + summed `estimatedValue`.
- Gate the "add stage / edit board" affordances behind `usePermission('manage_pipeline')`.

### 1.8 UX
Column header pills use `pipeline_stages.color`. Card shows lead name, source badge, assigned avatar,
value, and a "time in stage" chip that turns amber when stuck. RTL: columns flow right-to-left when
`defaultLanguage === "ar"`. Empty column = subtle dashed drop zone.

---

## FEATURE 2 — WhatsApp Business integration (the KSA differentiator)

Inbound WhatsApp → auto-attach to the matching lead → logged on the timeline. Outbound templated
replies from inside the CRM. This captures conversation history the company otherwise loses when an
agent leaves.

### 2.1 Provider choice
Use **WhatsApp Cloud API** (Meta) directly, or a BSP (Twilio/360dialog). Meta Cloud API is cheapest
and gives you the webhook model below. Store credentials per company (companies onboard their own
WABA number) encrypted in `companies/{cid}/settings/default.integrations.whatsapp`:
```
whatsapp: {
  enabled: boolean,
  phoneNumberId: string,       // Meta phone-number id
  wabaId: string,
  accessTokenRef: string,      // reference to Secret Manager, NOT the raw token
  verifyToken: string,         // for webhook handshake
  defaultTemplateNamespace: string,
}
```
**Never store the access token in Firestore.** Put it in Google Secret Manager and store only a
reference; the Cloud Function reads it at runtime.

### 2.2 Data model
**Messages** — `companies/{cid}/leads/{leadId}/messages/{messageId}`:
```
{
  companyId, leadId,
  channel: "whatsapp",
  direction: "inbound" | "outbound",
  waMessageId: string,          // provider id — UNIQUE, used for idempotency/dedup
  from: string, to: string,     // E.164
  type: "text"|"image"|"document"|"template",
  text: string|null,
  mediaUrl: string|null,        // re-hosted in Storage, not the ephemeral Meta URL
  templateName: string|null,
  status: "sent"|"delivered"|"read"|"failed"|"received",
  actorId: string|null,         // employee who sent (outbound)
  createdAt, updatedAt
}
```
**Inbound-before-lead-exists buffer** — `companies/{cid}/wa_inbox/{waMessageId}`: when a message
arrives from a number with no matching lead, park it here and surface an "unassigned WhatsApp"
tray where an agent can one-click create/attach a lead.

**Phone index** — to route inbound by number fast, keep `leads` queryable by `phone` (already stored,
already unique per company via `isFieldValueTaken`). Query `where("phone","==",normalized)`.

### 2.3 Architecture — the flow end to end
```
 Customer's WhatsApp
      │  (sends message)
      ▼
 Meta Cloud API  ──webhook POST──►  /api/webhooks/whatsapp   (Next route, runtime=nodejs)
                                          │  1. verify X-Hub-Signature-256 (HMAC of raw body)
                                          │  2. 200 OK IMMEDIATELY (Meta retries on timeout)
                                          │  3. enqueue: write raw event to  wa_events/{eventId}
                                          ▼
                          Cloud Function onDocumentCreated(wa_events/{id})
                                          │  a. resolve companyId from phoneNumberId
                                          │  b. dedup on waMessageId (idempotent)
                                          │  c. normalize sender phone → find lead in that company
                                          │  d. if lead: append to leads/{id}/messages
                                          │     else:    write to wa_inbox/{waMessageId}
                                          │  e. re-host media from Meta URL → Storage
                                          │  f. create notification + (optional) email
                                          ▼
                          Firestore listener / SWR revalidate → agent's browser timeline updates
```
**Why the two-step (webhook → `wa_events` → function)?** The webhook must return 200 within seconds
or Meta retries and duplicates. Persisting the raw event first makes ingestion durable and lets the
heavy work (media re-hosting, lead matching) happen in a retryable Cloud Function.

### 2.4 Webhook route (Layer 4) — `src/app/api/webhooks/whatsapp/route.ts`
- `GET`: Meta verification handshake — echo `hub.challenge` when `hub.verify_token` matches.
- `POST`:
  1. Read the **raw** body (needed for signature). Verify `X-Hub-Signature-256` = HMAC-SHA256(appSecret, rawBody).
     Reject 401 on mismatch. **This is unauthenticated by session** — the signature IS the auth.
  2. Parse, write each message as `wa_events/{provider_message_id}` with `processed: false`.
  3. Return `200 { received: true }` fast. Do NOT do lead matching here.
- No `getSessionUser` here — it's a machine-to-machine endpoint. Rate-limit by IP as defense in depth
  (reuse `src/lib/utils/rate-limit.ts`).

### 2.5 Outbound API (Layer 4) — `POST /api/companies/[companyId]/leads/[leadId]/messages`
- auth + `assertActiveMember` + `manage_leads`
- body `{ type: "text"|"template", text?, templateName?, variables? }`
- 24-hour window rule: outside Meta's 24h customer-service window you may only send **approved
  templates** — enforce it: if the last inbound message is >24h old and `type !== "template"`,
  return 409 with a helpful error.
- Call Meta Graph API with the company's token (from Secret Manager). On success write an outbound
  `messages` doc with the returned `waMessageId` and `status: "sent"`.
- A separate webhook status callback updates `status` to delivered/read/failed (match by `waMessageId`).

### 2.6 Security rules (Layer 2)
```
match /companies/{cid}/leads/{leadId}/messages/{msgId} {
  allow read:   if isSuperAdmin() || (isCompanyMember(cid)
                   && (hasPermission('manage_leads')
                       || (hasPermission('view_own_leads')
                           && get(/databases/$(database)/documents/companies/$(cid)/leads/$(leadId)).data.assignedTo == uid())));
  allow write:  if false;   // API + Cloud Functions only
}
match /companies/{cid}/wa_inbox/{id}   { allow read: if isCompanyMember(cid) && hasPermission('manage_leads'); allow write: if false; }
match /wa_events/{id}                   { allow read, write: if false; }  // Cloud Functions only
```
Add permission `MANAGE_INTEGRATIONS: "manage_integrations"` for connecting the WABA number (owner/admin).

### 2.7 Cloud Functions (Layer 3)
- `processWaEvent = onDocumentCreated("wa_events/{id}")` — the ingestion worker (§2.3 c–f). Guard with
  a transaction on `processed` to avoid double-processing on retries.
- `sendWaOnLeadAssigned` (optional): when a lead is assigned, fire a template "an agent will contact you".

### 2.8 UI (Layers 6–8)
- Add a **conversation panel** to the Customer-360 lead timeline (Feature 1's timeline): WhatsApp
  bubbles inline with notes/status changes, sorted by `createdAt`. Live via a Firestore `onSnapshot`
  listener on `messages` (reads allowed by rules above).
- Composer with template picker; disable free-text + show "outside 24h window — pick a template" when applicable.
- Settings → Integrations screen (gated `manage_integrations`) to connect the WABA number and run a test.
- An "Unassigned WhatsApp" tray fed by `wa_inbox` with one-click "create lead / attach to existing".

---

## FEATURE 3 — Credit-based Lead Marketplace (turns `lead_requests` into revenue)

Today `lead_requests` is a free-for-all broadcast inbox any company can claim (`claim/route.ts`).
Convert it into a **paid, quota-governed** channel: companies spend **credits** to claim exclusive or
first-look access. This is the first real money feature and the natural content for the
currently-hardcoded admin billing dashboard.

### 3.1 Data model
**Wallet** — `companies/{cid}/billing/wallet` (single doc):
```
{
  companyId,
  creditBalance: number,        // integer credits, never float
  lifetimePurchased: number,
  lifetimeSpent: number,
  updatedAt
}
```
**Ledger** (immutable audit) — `companies/{cid}/billing/wallet/ledger/{entryId}`:
```
{
  companyId,
  delta: number,                // +credits on purchase, -credits on spend
  balanceAfter: number,
  reason: "purchase"|"claim_lead"|"refund"|"admin_grant"|"monthly_allowance",
  refType: "lead_request"|"admin"|"plan", refId: string|null,
  actorId: string|null,
  createdAt
}
```
**Lead request pricing / access mode** — extend `lead_requests/{id}`:
```
accessMode: "exclusive" | "first_look" | "shared",
priceCredits: number,          // cost to claim
exclusiveClaimedBy: string|null, // companyId that bought exclusivity (locks others out)
maxClaims: number|null,         // for first_look: cap the number of buyers
// existing: claimedBy: { [companyId]: { leadId, ... } }
```
**Plan monthly allowance** — extend `PLAN_LIMITS` in `src/constants/plans.ts`:
```
free:       { maxListings: 5,  maxEmployees: 2,  monthlyLeadCredits: 0  }
starter:    { maxListings: 25, maxEmployees: 5,  monthlyLeadCredits: 20 }
pro:        { maxListings: 100,maxEmployees: 20, monthlyLeadCredits: 100}
enterprise: { maxListings: -1, maxEmployees: -1, monthlyLeadCredits: -1 }  // -1 = unlimited
```

### 3.2 Credits are integers — money-safety rules
- Store credits as **integers**, never floats (avoids the currency/rounding class of bug flagged in
  the review). If you later map credits→SAR, do it in halalas (integer minor units) at the display edge.
- Every balance change goes through the **ledger + wallet in one transaction**. The wallet balance is
  derived state; the ledger is the source of truth. Reject any spend that would drive `creditBalance < 0`.

### 3.3 Security rules (Layer 2)
```
match /companies/{cid}/billing/wallet {
  allow read:  if isSuperAdmin() || (isCompanyMember(cid) && hasPermission('billing_access'));
  allow write: if false;   // Admin SDK only — all mutations are transactional in the API/functions
  match /ledger/{entryId} {
    allow read:  if isSuperAdmin() || (isCompanyMember(cid) && hasPermission('billing_access'));
    allow write: if false;
  }
}
// lead_requests stays fully server-mediated (already allow read,write: if false)
```

### 3.4 API routes (Layer 4)
- Rewrite `POST /api/lead-requests/[id]/claim` (exists today) to charge credits **atomically**:
  ```ts
  await adminDb().runTransaction(async (tx) => {
    // READS first
    const reqSnap    = await tx.get(requestRef);
    const walletSnap = await tx.get(walletRef);
    // guards
    if (req.accessMode === "exclusive" && req.exclusiveClaimedBy && req.exclusiveClaimedBy !== companyId)
      throw new ClaimError("already_exclusive");
    if (alreadyClaimedByThisCompany) return existingLeadId;   // idempotent, no double charge
    const price = req.priceCredits ?? 0;
    if (balance < price) throw new ClaimError("insufficient_credits");   // 402 Payment Required
    // WRITES
    tx.set(leadRef, {...});                          // create the lead (as claim/route.ts does now)
    tx.update(requestRef, { [`claimedBy.${companyId}`]: {...},
                            ...(req.accessMode === "exclusive" ? { exclusiveClaimedBy: companyId } : {}) });
    tx.update(walletRef, { creditBalance: FieldValue.increment(-price),
                           lifetimeSpent: FieldValue.increment(price) });
    tx.set(ledgerRef, { delta: -price, balanceAfter: balance - price, reason: "claim_lead",
                        refType: "lead_request", refId: id, actorId: user.uid, createdAt: ... });
  });
  ```
  Return `402` on insufficient credits so the UI can show an upgrade/top-up CTA.
- `GET /api/companies/[companyId]/billing/wallet` — balance + recent ledger (perm `billing_access`).
- `POST /api/admin/companies/[companyId]/credits` — **super-admin only**, grant/deduct credits
  (`admin_grant`), same transactional wallet+ledger write. This is what the admin billing dashboard drives.

### 3.5 Cloud Functions (Layer 3)
- `grantMonthlyCredits = onSchedule("every 24 hours")` — for each active company, on the first of its
  billing cycle, top up `monthlyLeadCredits` from its plan (skip `-1` unlimited; don't roll over unless
  you decide to). One transactional wallet+ledger write per company, dedup by a `lastAllowanceMonth` field.
- Reuse `set_plan` in `admin/companies/[companyId]/route.ts`: when plan changes, no immediate grant —
  let the scheduler handle the next cycle (or grant a prorated amount if you want to be generous).

### 3.6 UI (Layers 6–8)
- **Company:** a "Leads Marketplace" screen listing `lead_requests` with price + access-mode badges
  ("Exclusive · 5 credits", "First look · 2 credits"). A wallet balance chip in the header. Claim button
  → confirm modal showing cost and resulting balance → `POST claim`. On `402`, show top-up/upgrade.
- **Super admin:** wire the (currently hardcoded) `admin/billing/page.tsx` to real data — sum ledger
  `purchase`/`spent`, show per-company balances, and a grant-credits action.
- Gate all wallet UI behind `usePermission('billing_access')`.

---

## Suggested execution order (dependency-aware)

1. **§1.0 prerequisites** — `assertActiveMember` guard + transactional counters. *(fixes review bugs,
   unblocks everything)*
2. **Feature 1 — Kanban pipeline.** Pure reuse of `leads`; ships the most visible value fastest.
3. **Feature 1's Customer-360 timeline** — needed as the surface Feature 2 plugs into.
4. **Feature 2 — WhatsApp.** Biggest differentiator; depends on the timeline existing.
5. **Feature 3 — Lead credits.** Monetization; depends on nothing but is best last so the marketplace
   has an active CRM to feed into.

## Definition of done for each feature
- [ ] Firestore rules updated **and** tested with the emulator (deny direct client write where API-only).
- [ ] New permissions added to `PERMISSIONS`, `ROLE_PERMISSIONS`, **and** the mirror in `functions/src/index.ts`.
- [ ] API routes: auth → `assertActiveMember` → permission → validate → transactional write.
- [ ] No money/quota mutation outside a transaction; credits are integers.
- [ ] Bilingual en/ar labels + RTL verified.
- [ ] Cloud Functions idempotent (dedup on provider/message id).
- [ ] Server component uses `requireCompanyMember()`; client mutations go through `/api`, never direct writes.

## Cross-cutting reminders
- Keep `functions/src/index.ts`'s `ROLE_PERMISSIONS` in lockstep with `src/constants/permissions.ts`.
- Any new company-owned collection needs a matching `firestore.rules` block AND a fallthrough that
  stays `deny` — the final `match /{document=**}` already denies by default; don't weaken it.
- Denormalize counters onto the company doc for anything you'll show in a list (wallet balance,
  open-deal count) to avoid N aggregate reads.
```
```
