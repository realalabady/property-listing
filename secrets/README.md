# Secrets Folder

**This folder is git-ignored. Never commit its contents.**

## Usage

1. Download your Firebase Admin SDK service account JSON from:
   https://console.firebase.google.com/project/property-listing-7f3db/settings/serviceaccounts/adminsdk
   (Click "Generate new private key" → save the JSON file here.)

2. Place **exactly one** `.json` file in this folder.

3. From the project root run:

   ```
   node scripts/setup-admin-sdk.mjs
   ```

   This injects `FIREBASE_ADMIN_*` values into `.env.local`.

4. Restart the dev server so Next.js reloads env:
   ```
   npm run dev
   ```

## Why this matters

The Admin SDK is required for:

- Verifying Firebase ID tokens server-side (`/api/auth/session`)
- Creating session cookies
- Setting custom claims (role / companyId / permissions)
- Cloud Functions (Phase 3)

Without it, login will fail with "admin sdk not initialized".
