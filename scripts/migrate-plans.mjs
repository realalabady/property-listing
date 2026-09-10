#!/usr/bin/env node
/**
 * Migrate companies to the current plan lineup.
 * ---------------------------------------------
 * - Retired `free` (and any unknown) plan → `starter`.
 * - Rewrites each company's stored `limits` from the current plan table.
 *
 * Dry-run by default: prints what would change and writes nothing.
 *
 * Usage:
 *   node scripts/migrate-plans.mjs            # dry run
 *   node scripts/migrate-plans.mjs --apply    # write the changes
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const rawLine of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const APPLY = process.argv.includes("--apply");

const PROJECT_ID = (
  process.env.ADMIN_PROJECT_ID ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  ""
).trim();
const CLIENT_EMAIL = (
  process.env.ADMIN_CLIENT_EMAIL ||
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
  ""
).trim();
const PRIVATE_KEY = (
  process.env.ADMIN_PRIVATE_KEY ||
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  ""
)
  .replace(/\\n/g, "\n")
  .trim();

if (!PROJECT_ID) {
  console.error("Missing ADMIN_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  process.exit(1);
}

initializeApp({
  credential:
    CLIENT_EMAIL && PRIVATE_KEY
      ? cert({
          projectId: PROJECT_ID,
          clientEmail: CLIENT_EMAIL,
          privateKey: PRIVATE_KEY,
        })
      : applicationDefault(),
  projectId: PROJECT_ID,
});

const db = getFirestore();

// Mirrored from src/constants/plans.ts (plain JS — no TS imports).
const PLAN_LIMITS = {
  starter: { maxListings: 20, maxEmployees: 2 },
  pro: { maxListings: 100, maxEmployees: 25 },
  enterprise: { maxListings: -1, maxEmployees: -1 },
};

function parsePlan(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.hasOwn(PLAN_LIMITS, normalized) ? normalized : "starter";
}

const sameLimits = (a, b) =>
  a &&
  typeof a === "object" &&
  a.maxListings === b.maxListings &&
  a.maxEmployees === b.maxEmployees;

const snap = await db.collection("companies").get();
const changes = [];

for (const doc of snap.docs) {
  const data = doc.data();
  const plan = parsePlan(data.subscriptionPlan);
  const limits = PLAN_LIMITS[plan];
  const planChanged = data.subscriptionPlan !== plan;
  const limitsChanged = !sameLimits(data.limits, limits);
  if (!planChanged && !limitsChanged) continue;
  changes.push({ ref: doc.ref, name: data.name ?? "", from: data.subscriptionPlan, plan, limits });
}

console.log(
  `${APPLY ? "APPLY" : "DRY RUN"} — project ${PROJECT_ID}: ${snap.size} companies, ${changes.length} to update.`,
);
for (const c of changes) {
  console.log(
    `  ${c.ref.id} (${c.name}): plan ${JSON.stringify(c.from)} → ${c.plan}, limits → ${JSON.stringify(c.limits)}`,
  );
}

if (!APPLY) {
  console.log("No changes written. Re-run with --apply to write.");
  process.exit(0);
}

for (let i = 0; i < changes.length; i += 400) {
  const batch = db.batch();
  for (const c of changes.slice(i, i + 400)) {
    batch.update(c.ref, {
      subscriptionPlan: c.plan,
      limits: c.limits,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}
console.log(`Updated ${changes.length} companies.`);
