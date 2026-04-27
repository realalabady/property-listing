#!/usr/bin/env node
/**
 * Reads the Firebase Admin SDK service-account JSON from ./secrets/
 * and injects FIREBASE_ADMIN_* values into .env.local.
 *
 * Usage:
 *   1. Download service-account JSON from Firebase Console and drop it into ./secrets/
 *   2. node scripts/setup-admin-sdk.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SECRETS_DIR = path.join(ROOT, "secrets");
const ENV_FILE = path.join(ROOT, ".env.local");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

// 1. Find a JSON file in ./secrets/
if (!fs.existsSync(SECRETS_DIR)) {
  die(
    `Folder not found: ${SECRETS_DIR}\n` +
      `Create it and place your downloaded service-account JSON inside.`,
  );
}

const jsonFiles = fs
  .readdirSync(SECRETS_DIR)
  .filter((f) => f.endsWith(".json"));

if (jsonFiles.length === 0) {
  die(
    `No .json file found in ${SECRETS_DIR}\n` +
      `Download one from: https://console.firebase.google.com/project/property-listing-7f3db/settings/serviceaccounts/adminsdk`,
  );
}

if (jsonFiles.length > 1) {
  die(
    `Multiple JSON files in ${SECRETS_DIR}. Keep only the correct service-account JSON.\nFound: ${jsonFiles.join(", ")}`,
  );
}

const jsonPath = path.join(SECRETS_DIR, jsonFiles[0]);
console.log(`[setup] Using service account: ${jsonFiles[0]}`);

const sa = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

// 2. Validate required fields
const required = ["project_id", "client_email", "private_key"];
for (const key of required) {
  if (!sa[key]) die(`Service account JSON is missing "${key}"`);
}

if (sa.project_id !== "property-listing-7f3db") {
  console.warn(
    `[setup] ⚠ JSON project_id "${sa.project_id}" != "property-listing-7f3db" — continuing anyway.`,
  );
}

// 3. Read & patch .env.local
if (!fs.existsSync(ENV_FILE)) {
  die(`${ENV_FILE} not found. Create it first (copy from .env.local.example).`);
}

let env = fs.readFileSync(ENV_FILE, "utf8");

// Escape private_key: keep newlines as literal "\n" so .env parses correctly
const escapedKey = sa.private_key.replace(/\n/g, "\\n");

function upsert(name, value) {
  const re = new RegExp(`^${name}=.*$`, "m");
  const line = `${name}=${value}`;
  if (re.test(env)) env = env.replace(re, line);
  else env += `\n${line}`;
}

// Use unquoted values for PROJECT_ID and CLIENT_EMAIL
upsert("FIREBASE_ADMIN_PROJECT_ID", sa.project_id);
upsert("FIREBASE_ADMIN_CLIENT_EMAIL", sa.client_email);
// PRIVATE_KEY must be wrapped in double quotes to preserve \n inside .env
upsert("FIREBASE_ADMIN_PRIVATE_KEY", `"${escapedKey}"`);

fs.writeFileSync(ENV_FILE, env, "utf8");

console.log(`[setup] ✅ Injected FIREBASE_ADMIN_* values into .env.local`);
console.log(`[setup]    project_id   = ${sa.project_id}`);
console.log(`[setup]    client_email = ${sa.client_email}`);
console.log(
  `[setup]    private_key  = <hidden, ${sa.private_key.length} chars>`,
);
console.log(
  `\n[setup] Next: restart "npm run dev" so Next.js reloads .env.local.\n`,
);
