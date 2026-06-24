# Multi-Tenant Real Estate SaaS — Phase Tracker

## PHASE 1 — Foundation (COMPLETE ✓)

### Config & Scaffold

- [x] package.json (Next 15, React 19, TS, Tailwind v3, Firebase, Zustand, Zod)
- [x] tsconfig.json
- [x] next.config.ts
- [x] tailwind.config.ts
- [x] postcss.config.mjs
- [x] .env.local.example
- [x] .env.local (populated with Property Listing project config)
- [x] .gitignore
- [x] firebase.json
- [x] .firebaserc → property-listing-7f3db
- [x] firestore.indexes.json
- [x] firestore.rules (Phase 1 baseline — full hardening in Phase 3)
- [x] storage.rules (Phase 1 baseline)

### Types

- [x] src/types/company.ts
- [x] src/types/user.ts
- [x] src/types/listing.ts
- [x] src/types/lead.ts
- [x] src/types/task.ts
- [x] src/types/kpi.ts
- [x] src/types/index.ts

### Constants

- [x] src/constants/roles.ts (9 roles)
- [x] src/constants/permissions.ts (~30 permissions + role→perms map)
- [x] src/constants/listing-categories.ts
- [x] src/constants/routes.ts

### Firebase Layer

- [x] src/lib/firebase/config.ts (graceful degradation if env missing)
- [x] src/lib/firebase/client.ts (singleton)
- [x] src/lib/firebase/admin.ts (server-only singleton)

### Auth Layer

- [x] src/lib/auth/claims.ts (AppClaims type + helpers)
- [x] src/lib/auth/session.ts (cookie-based session)
- [x] src/lib/auth/guards.ts (requireAuth, CompanyMember, SuperAdmin, Role, Permission)
- [x] src/hooks/useAuth.ts
- [x] src/hooks/usePermission.ts
- [x] src/store/auth.store.ts (Zustand)

### Middleware

- [x] src/middleware.ts (protects /dashboard, /admin, /onboarding)

### App Shell

- [x] src/app/layout.tsx (providers + fonts)
- [x] src/app/globals.css (Tailwind + design tokens)
- [x] src/app/page.tsx (platform landing)
- [x] src/app/(public)/layout.tsx
- [x] src/app/(company)/dashboard/layout.tsx (guarded)
- [x] src/app/(company)/dashboard/page.tsx
- [x] src/app/(admin)/admin/layout.tsx (guarded)
- [x] src/app/(admin)/admin/page.tsx
- [x] src/app/(auth)/login/page.tsx (Suspense wrapper)
- [x] src/app/(auth)/login/LoginForm.tsx (useSearchParams client)
- [x] src/app/api/auth/session/route.ts (POST/DELETE)
- [x] src/components/providers/AuthBootstrap.tsx
- [x] src/lib/utils/cn.ts

### i18n (basic scaffold)

- [x] src/lib/i18n/index.ts
- [x] src/lib/i18n/locales/en.json
- [x] src/lib/i18n/locales/ar.json

### Docs & Tooling

- [x] README.md
- [x] scripts/check.ps1 (route smoke tests)

### VERIFICATION

- [x] `npm install` → 561 packages, 0 vulnerabilities critical
- [x] `tsc --noEmit` → PASS (0 errors)
- [x] `npm run build` → PASS (BUILD_ID: sPdeRbUPpjuYKLiPx3_A4)
- [x] `npm run dev` → Ready in 2.7s
- [x] Route smoke: / = 200, /login = 200, /dashboard = 307, /admin = 307
- [x] Firebase CLI logged in as fakealabady@gmail.com
- [x] Project `property-listing-7f3db` linked via .firebaserc
- [x] Firestore rules deployed to cloud.firestore
- [x] Firestore indexes deployed (default database)
- [x] Web SDK config populated in .env.local

### REMAINING PHASE 1 MANUAL STEPS (for user)

- [x] Enable **Email/Password** provider in Firebase Console → Authentication
  - https://console.firebase.google.com/project/property-listing-7f3db/authentication/providers
- [ ] (Optional) Generate Admin SDK service account key and fill
      `FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY` in .env.local
  - https://console.firebase.google.com/project/property-listing-7f3db/settings/serviceaccounts/adminsdk
  - Needed for: server-side session cookies, setting custom claims, Cloud Functions
- [ ] (Optional) Provision Storage bucket if not already
  - https://console.firebase.google.com/project/property-listing-7f3db/storage

---

## PHASE 2 — Public Website + Dashboard UI + Listings CRUD + Leads (COMPLETE CORE)

## PHASE 3 — KPI + Tasks + Cloud Functions + Security Rules Hardening (IN PROGRESS)

### Phase 3 Progress

- [x] Cloud Functions workspace scaffolded (`functions/` TypeScript project)
- [x] Listing publish/unpublish sync to `global_listings`
- [x] Lead auto-assignment (round robin)
- [x] Employee role/permission claim sync
- [x] Task escalation scheduler (`every 15 minutes`)
- [x] KPI overview scheduler (`every 30 minutes`)
- [x] KPI/tasks dashboard pages switched from static mock data to Firestore-backed reads
- [x] Firestore/Storage rules hardened for role + permission constraints
- [ ] Cloud Functions deployment and production verification
- [x] KPI employee snapshot automation
- [ ] Notification delivery channels (email/WhatsApp) for escalations

## PHASE 4 — Launch Checklist + Scaling (COMPLETE ✓)

- [x] Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) in next.config.ts
- [x] Global error page (500) and not-found page (404)
- [x] Dashboard overview with real Firestore data (active listings, new leads, pending tasks, team members)
- [x] Admin overview with real Firestore data (companies, published listings, users)
- [x] Admin companies page with real Firestore data (live list from companies collection)
- [x] Tasks CRUD API (GET/POST collection + PUT/DELETE single) with permission-aware access
- [x] DashboardTasksClient — interactive task board (create, status update, delete, filter)
- [x] Per-employee KPI snapshot automation (Cloud Function: refreshEmployeeKpiSnapshots every 60min)
- [x] Email notifications for lead submissions (onLeadCreatedSendEmail) with SMTP via env vars
- [x] Email notifications for task escalations (onTaskEscalationSendEmail) via notifications trigger
- [x] Rate limiting on auth session endpoint (10 req/min per IP) with Retry-After header
- [x] In-process rate limiter utility (src/lib/utils/rate-limit.ts)
- [x] Final verification: typecheck PASS, build PASS, functions:build PASS
