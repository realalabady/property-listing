# Implementation Status

Date: 2026-04-27

## Phase 3 In Progress (2026-04-30)

- Added Cloud Functions TypeScript workspace under `functions/`.
- Implemented listing sync automation to maintain `global_listings`.
- Implemented lead round-robin assignment automation.
- Implemented employee Firestore-to-Auth claim synchronization.
- Implemented scheduled task escalation workflow.
- Implemented scheduled KPI overview aggregation workflow.
- Replaced dashboard KPI and tasks pages with Firestore-backed reads.
- Hardened Firestore and Storage security rules around permissions and ownership.

## Verified Working

- TypeScript checks pass.
- Next.js production build passes.
- Auth session flow works with Firebase Auth + session cookie exchange.
- Route guards and middleware protections are active.

## Working Feature Areas

### Public pages

- Home page.
- Global marketplace list.
- Global marketplace property detail.
- Company landing page by slug.
- Company properties page.
- Company property detail page.
- Company contact page with lead submission.

### Auth and onboarding

- Login page and form.
- Signup page and form.
- Onboarding page scaffold.

### Company dashboard

- Overview page scaffold.
- Listings page with Firestore-backed create/status/feature/delete actions.
- Leads page with Firestore-backed create and pipeline status updates.
- Employees page scaffold.
- Tasks page scaffold.
- KPI page scaffold.
- Settings page scaffold.

### Platform admin

- Admin overview scaffold.
- Admin companies page scaffold.
- Admin billing page scaffold.
- Admin analytics page scaffold.

## What Is Still Pending

- Cloud Functions deployment + production smoke validation.
- Notifications channel integrations (email/WhatsApp) beyond in-app notification docs.
- Replace dashboard/admin mock metrics with Firestore-backed data for employees/tasks/kpi/admin analytics.
- Production hardening pass for Firestore/Storage rules after Cloud Functions are in place.
- Full media upload workflow and listing editor enhancements.

## Main Added/Updated Paths

- src/features/listings
- src/features/leads
- src/features/public
- src/app/(public)/properties
- src/app/(public)/c
- src/app/(company)/dashboard/listings
- src/app/(company)/dashboard/leads
- src/app/(company)/dashboard/employees
- src/app/(company)/dashboard/tasks
- src/app/(company)/dashboard/kpi
- src/app/(company)/dashboard/settings
- src/app/(auth)/signup
- src/app/(company)/onboarding
- src/app/(admin)/admin/companies
- src/app/(admin)/admin/billing
- src/app/(admin)/admin/analytics
