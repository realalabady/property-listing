import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as nodemailer from "nodemailer";

if (getApps().length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

setGlobalOptions({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 120,
  maxInstances: 10,
});

const LEAD_ASSIGNABLE_ROLES = [
  "sales",
  "manager",
  "company_admin",
  "company_owner",
] as const;

const ACTIVE_LISTING_STATUSES = [
  "draft",
  "pending_review",
  "published",
] as const;

const DEAL_CLOSED_STATUSES = ["sold", "rented"] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "create_listing",
    "edit_listing",
    "edit_own_listing",
    "delete_listing",
    "publish_listing",
    "assign_listing",
    "feature_listing",
    "create_employee",
    "edit_employee",
    "remove_employee",
    "view_employees",
    "manage_permission_groups",
    "create_task",
    "assign_tasks",
    "escalate_tasks",
    "complete_tasks",
    "manage_leads",
    "view_own_leads",
    "assign_leads",
    "view_kpi",
    "view_own_kpi",
    "export_reports",
    "company_settings_access",
    "billing_access",
    "manage_branding",
    "platform_manage_companies",
    "platform_manage_billing",
    "platform_view_analytics",
  ],
  company_owner: [
    "create_listing",
    "edit_listing",
    "delete_listing",
    "publish_listing",
    "assign_listing",
    "feature_listing",
    "create_employee",
    "edit_employee",
    "remove_employee",
    "view_employees",
    "manage_permission_groups",
    "create_task",
    "assign_tasks",
    "escalate_tasks",
    "complete_tasks",
    "manage_leads",
    "assign_leads",
    "view_kpi",
    "export_reports",
    "company_settings_access",
    "billing_access",
    "manage_branding",
  ],
  company_admin: [
    "create_listing",
    "edit_listing",
    "delete_listing",
    "publish_listing",
    "assign_listing",
    "feature_listing",
    "create_employee",
    "edit_employee",
    "remove_employee",
    "view_employees",
    "manage_permission_groups",
    "create_task",
    "assign_tasks",
    "escalate_tasks",
    "complete_tasks",
    "manage_leads",
    "assign_leads",
    "view_kpi",
    "export_reports",
    "company_settings_access",
    "manage_branding",
  ],
  manager: [
    "create_listing",
    "edit_listing",
    "publish_listing",
    "assign_listing",
    "feature_listing",
    "view_employees",
    "create_task",
    "assign_tasks",
    "escalate_tasks",
    "complete_tasks",
    "manage_leads",
    "assign_leads",
    "view_kpi",
    "export_reports",
  ],
  sales: [
    "create_listing",
    "edit_own_listing",
    "manage_leads",
    "view_own_leads",
    "complete_tasks",
    "view_own_kpi",
  ],
  marketing: [
    "manage_leads",
    "view_own_leads",
    "complete_tasks",
    "view_own_kpi",
    "feature_listing",
  ],
  data_entry: [
    "create_listing",
    "edit_own_listing",
    "complete_tasks",
    "view_own_kpi",
  ],
  accountant: ["billing_access", "export_reports", "view_kpi"],
  viewer: ["view_employees", "view_own_kpi"],
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function currentPeriod(date = new Date()): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function startOfCurrentMonth(date = new Date()): Timestamp {
  return Timestamp.fromDate(
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
    ),
  );
}

function globalListingDocId(companyId: string, listingId: string): string {
  return `${companyId}_${listingId}`;
}

function companyIdFromTaskPath(path: string): string | null {
  const parts = path.split("/");
  if (parts.length < 4) return null;
  if (parts[0] !== "companies") return null;
  return parts[1] ?? null;
}

async function loadPermissionGroupPermissions(
  companyId: string,
  groupIdsRaw: unknown,
): Promise<string[]> {
  if (!Array.isArray(groupIdsRaw) || groupIdsRaw.length === 0) {
    return [];
  }

  const groupIds = Array.from(
    new Set(
      groupIdsRaw.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0,
      ),
    ),
  ).slice(0, 25);

  if (groupIds.length === 0) {
    return [];
  }

  const refs = groupIds.map((groupId) =>
    db.doc(`companies/${companyId}/permission_groups/${groupId}`),
  );
  const snaps = await db.getAll(...refs);

  const permissions: string[] = [];
  for (const snap of snaps) {
    if (!snap.exists || snap.get("active") === false) {
      continue;
    }

    const groupPermissions = snap.get("permissions");
    if (!Array.isArray(groupPermissions)) {
      continue;
    }

    for (const permission of groupPermissions) {
      if (typeof permission === "string") {
        permissions.push(permission);
      }
    }
  }

  return permissions;
}

async function taskEscalationHours(companyId: string): Promise<number> {
  const settingsSnap = await db
    .doc(`companies/${companyId}/settings/default`)
    .get();
  const configured = settingsSnap.get("taskEscalationHours");
  if (typeof configured === "number" && configured >= 0) {
    return configured;
  }
  return 24;
}

async function recomputeCompanyKpi(companyId: string): Promise<void> {
  const listingsRef = db.collection(`companies/${companyId}/listings`);
  const leadsRef = db.collection(`companies/${companyId}/leads`);
  const tasksRef = db.collection(`companies/${companyId}/tasks`);
  const employeesRef = db.collection(`companies/${companyId}/employees`);
  const monthStart = startOfCurrentMonth();

  const [
    totalListingsAgg,
    activeListingsAgg,
    totalLeadsAgg,
    newLeadsAgg,
    convertedLeadsAgg,
    activeEmployeesAgg,
    completedTasksAgg,
    overdueTasksAgg,
    responseLeadsSnap,
    closedDealsSnap,
  ] = await Promise.all([
    listingsRef.count().get(),
    listingsRef
      .where("status", "in", [...ACTIVE_LISTING_STATUSES])
      .count()
      .get(),
    leadsRef.count().get(),
    leadsRef.where("createdAt", ">=", monthStart).count().get(),
    leadsRef.where("status", "==", "deal").count().get(),
    employeesRef.where("active", "==", true).count().get(),
    tasksRef.where("status", "==", "done").count().get(),
    tasksRef.where("escalated", "==", true).count().get(),
    leadsRef
      .where("responseTimeMinutes", ">=", 0)
      .select("responseTimeMinutes")
      .get(),
    listingsRef
      .where("status", "in", [...DEAL_CLOSED_STATUSES])
      .select("price")
      .get(),
  ]);

  let responseTotal = 0;
  let responseCount = 0;
  for (const leadDoc of responseLeadsSnap.docs) {
    const value = leadDoc.get("responseTimeMinutes");
    if (typeof value === "number" && value >= 0) {
      responseTotal += value;
      responseCount += 1;
    }
  }

  let totalRevenue = 0;
  for (const listingDoc of closedDealsSnap.docs) {
    const price = listingDoc.get("price");
    if (typeof price === "number" && price > 0) {
      totalRevenue += price;
    }
  }

  const avgResponseMinutes =
    responseCount > 0
      ? Math.round((responseTotal / responseCount) * 100) / 100
      : 0;

  await db.doc(`companies/${companyId}/kpi/current`).set(
    {
      companyId,
      period: currentPeriod(),
      totalListings: totalListingsAgg.data().count,
      activeListings: activeListingsAgg.data().count,
      totalLeads: totalLeadsAgg.data().count,
      newLeadsThisMonth: newLeadsAgg.data().count,
      convertedLeads: convertedLeadsAgg.data().count,
      totalRevenue,
      totalEmployees: activeEmployeesAgg.data().count,
      avgResponseMinutes,
      tasksCompleted: completedTasksAgg.data().count,
      tasksOverdue: overdueTasksAgg.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export const syncGlobalListing = onDocumentWritten(
  "companies/{companyId}/listings/{listingId}",
  async (event) => {
    const companyId = event.params.companyId;
    const listingId = event.params.listingId;
    const listingAfter = event.data?.after.data() as
      | Record<string, unknown>
      | undefined;
    const globalRef = db.doc(
      `global_listings/${globalListingDocId(companyId, listingId)}`,
    );

    if (!listingAfter || listingAfter.status !== "published") {
      await globalRef.delete().catch(() => undefined);
      logger.info("Removed listing from global marketplace", {
        companyId,
        listingId,
      });
      return;
    }

    const companySnap = await db.doc(`companies/${companyId}`).get();
    const company = companySnap.data() as Record<string, unknown> | undefined;
    const location = (listingAfter.location ?? {}) as Record<string, unknown>;

    await globalRef.set(
      {
        sourceListingId: listingId,
        companyId,
        companyName:
          typeof company?.name === "string" ? company.name : "Company",
        companySlug: typeof company?.slug === "string" ? company.slug : "",
        companyLogo: typeof company?.logo === "string" ? company.logo : "",
        title:
          typeof listingAfter.title === "string"
            ? listingAfter.title
            : "Untitled property",
        titleAr:
          typeof listingAfter.titleAr === "string"
            ? listingAfter.titleAr
            : null,
        type:
          typeof listingAfter.type === "string" ? listingAfter.type : "sale",
        category:
          typeof listingAfter.category === "string"
            ? listingAfter.category
            : "apartment",
        price: typeof listingAfter.price === "number" ? listingAfter.price : 0,
        currency:
          typeof listingAfter.currency === "string"
            ? listingAfter.currency
            : "SAR",
        rentPeriod:
          typeof listingAfter.rentPeriod === "string"
            ? listingAfter.rentPeriod
            : null,
        city: typeof location.city === "string" ? location.city : "",
        country: typeof location.country === "string" ? location.country : "",
        region: typeof location.region === "string" ? location.region : "",
        district:
          typeof location.district === "string" ? location.district : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
        bedrooms:
          typeof listingAfter.bedrooms === "number"
            ? listingAfter.bedrooms
            : null,
        bathrooms:
          typeof listingAfter.bathrooms === "number"
            ? listingAfter.bathrooms
            : null,
        area: typeof listingAfter.area === "number" ? listingAfter.area : 0,
        areaUnit:
          typeof listingAfter.areaUnit === "string"
            ? listingAfter.areaUnit
            : "sqm",
        coverImage:
          typeof listingAfter.coverImage === "string"
            ? listingAfter.coverImage
            : "",
        status: "published",
        featured: Boolean(listingAfter.featured),
        createdAt: listingAfter.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await recomputeCompanyKpi(companyId);

    logger.info("Synced listing to global marketplace", {
      companyId,
      listingId,
    });
  },
);

export const autoAssignLead = onDocumentCreated(
  "companies/{companyId}/leads/{leadId}",
  async (event) => {
    const companyId = event.params.companyId;
    const leadId = event.params.leadId;
    const leadRef = db.doc(`companies/${companyId}/leads/${leadId}`);
    const settingsRef = db.doc(`companies/${companyId}/settings/default`);

    await db.runTransaction(async (tx) => {
      const [leadSnap, settingsSnap] = await Promise.all([
        tx.get(leadRef),
        tx.get(settingsRef),
      ]);

      if (!leadSnap.exists) return;

      const lead = leadSnap.data() as Record<string, unknown>;
      if (typeof lead.assignedTo === "string" && lead.assignedTo.length > 0) {
        return;
      }

      const leadAutoAssign = settingsSnap.get("leadAutoAssign");
      const strategyRaw = settingsSnap.get("leadAutoAssignStrategy");
      const strategy =
        strategyRaw === "least_busy" || strategyRaw === "manual"
          ? strategyRaw
          : "round_robin";

      // "manual" (or an explicit opt-out) means a human assigns leads — skip.
      if (leadAutoAssign === false || strategy === "manual") {
        return;
      }

      const employeesQuery = db
        .collection(`companies/${companyId}/employees`)
        .where("active", "==", true)
        .where("role", "in", [...LEAD_ASSIGNABLE_ROLES]);

      // Reads must precede writes in a transaction; gather everything first.
      const employeesSnap = await tx.get(employeesQuery);
      if (employeesSnap.empty) {
        logger.info("No active employees found for lead assignment", {
          companyId,
          leadId,
        });
        return;
      }

      const employees = employeesSnap.docs;
      let selectedEmployee = employees[0];

      const settingsUpdate: Record<string, unknown> = {
        leadAutoAssign: true,
        leadAutoAssignStrategy: strategy,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (strategy === "least_busy") {
        // Pick the rep with the fewest OPEN (non-terminal) leads.
        const openLeadsSnap = await tx.get(
          db
            .collection(`companies/${companyId}/leads`)
            .where("status", "in", ["new", "contacted", "qualified"])
            .select("assignedTo"),
        );

        const load = new Map<string, number>();
        for (const doc of openLeadsSnap.docs) {
          const assignee = doc.get("assignedTo");
          if (typeof assignee === "string" && assignee.length > 0) {
            load.set(assignee, (load.get(assignee) ?? 0) + 1);
          }
        }

        selectedEmployee = employees.reduce((best, candidate) =>
          (load.get(candidate.id) ?? 0) < (load.get(best.id) ?? 0)
            ? candidate
            : best,
        );
      } else {
        // round_robin: rotate through reps using a persisted cursor.
        const cursor = settingsSnap.get("leadRoundRobinCursor");
        const cursorValue =
          typeof cursor === "number" && cursor >= 0 ? cursor : 0;
        selectedEmployee = employees[cursorValue % employees.length];
        settingsUpdate.leadRoundRobinCursor = cursorValue + 1;
      }

      tx.update(leadRef, {
        assignedTo: selectedEmployee.id,
        assignedToName:
          typeof selectedEmployee.get("name") === "string"
            ? selectedEmployee.get("name")
            : "Assigned employee",
        assignedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(settingsRef, settingsUpdate, { merge: true });
    });

    await recomputeCompanyKpi(companyId);

    logger.info("Processed lead auto-assignment", { companyId, leadId });
  },
);

export const syncEmployeeClaims = onDocumentWritten(
  "companies/{companyId}/employees/{uid}",
  async (event) => {
    const companyId = event.params.companyId;
    const uid = event.params.uid;
    const employeeAfter = event.data?.after.data() as
      | Record<string, unknown>
      | undefined;

    if (!employeeAfter || employeeAfter.active === false) {
      await admin.auth().setCustomUserClaims(uid, {
        role: null,
        companyId: null,
        permissions: [],
      });
      await admin.auth().revokeRefreshTokens(uid);
      logger.info("Cleared employee claims", { companyId, uid });
      await recomputeCompanyKpi(companyId);
      return;
    }

    const role =
      typeof employeeAfter.role === "string" && employeeAfter.role.length > 0
        ? employeeAfter.role
        : "viewer";

    const basePermissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
    const groupPermissions = await loadPermissionGroupPermissions(
      companyId,
      employeeAfter.permissionGroupIds,
    );
    const customPermissions = Array.isArray(employeeAfter.permissions)
      ? employeeAfter.permissions.filter(
          (p): p is string => typeof p === "string",
        )
      : [];

    const permissions = Array.from(
      new Set([...basePermissions, ...groupPermissions, ...customPermissions]),
    );

    await admin.auth().setCustomUserClaims(uid, {
      role,
      companyId,
      permissions,
    });
    await admin.auth().revokeRefreshTokens(uid);

    logger.info("Synced employee claims", { companyId, uid, role });
    await recomputeCompanyKpi(companyId);
  },
);

export const escalateOverdueTasks = onSchedule("every 15 minutes", async () => {
  const now = new Date();
  const nowTimestamp = Timestamp.fromDate(now);
  const settingsCache = new Map<string, number>();

  let totalEscalated = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db
      .collectionGroup("tasks")
      .where("escalated", "==", false)
      .where("dueDate", "<=", nowTimestamp)
      .limit(300);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    if (snap.empty) {
      break;
    }

    const batch = db.batch();

    for (const taskDoc of snap.docs) {
      const task = taskDoc.data() as Record<string, unknown>;
      const status = typeof task.status === "string" ? task.status : "todo";
      if (status === "done" || status === "cancelled") {
        continue;
      }

      const companyId = companyIdFromTaskPath(taskDoc.ref.path);
      if (!companyId) {
        continue;
      }

      const dueDate = toDate(task.dueDate);
      if (!dueDate) {
        continue;
      }

      let escalationHours = settingsCache.get(companyId);
      if (escalationHours === undefined) {
        escalationHours = await taskEscalationHours(companyId);
        settingsCache.set(companyId, escalationHours);
      }

      const cutoff = dueDate.getTime() + escalationHours * 60 * 60 * 1000;
      if (now.getTime() < cutoff) {
        continue;
      }

      batch.update(taskDoc.ref, {
        escalated: true,
        escalatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.set(db.collection(`companies/${companyId}/notifications`).doc(), {
        type: "task_escalated",
        taskId: taskDoc.id,
        title: typeof task.title === "string" ? task.title : "Task",
        status,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });

      totalEscalated += 1;
    }

    await batch.commit();
    lastDoc = snap.docs[snap.docs.length - 1];

    if (snap.size < 300) {
      break;
    }
  }

  logger.info("Task escalation cron completed", {
    escalated: totalEscalated,
  });
});

export const refreshKpiOverviews = onSchedule("every 30 minutes", async () => {
  const companiesSnap = await db.collection("companies").select().get();
  let processed = 0;

  for (const companyDoc of companiesSnap.docs) {
    await recomputeCompanyKpi(companyDoc.id);
    processed += 1;
  }

  logger.info("KPI overview refresh completed", {
    companiesProcessed: processed,
  });
});

export const onTaskWriteRefreshKpi = onDocumentWritten(
  "companies/{companyId}/tasks/{taskId}",
  async (event) => {
    await recomputeCompanyKpi(event.params.companyId);
  },
);

export const onLeadWriteRefreshKpi = onDocumentWritten(
  "companies/{companyId}/leads/{leadId}",
  async (event) => {
    await recomputeCompanyKpi(event.params.companyId);
  },
);

// ---------------------------------------------------------------------------
// Per-employee KPI snapshot
// ---------------------------------------------------------------------------

async function recomputeEmployeeKpi(
  companyId: string,
  employeeUid: string,
): Promise<void> {
  const leadsRef = db.collection(`companies/${companyId}/leads`);
  const tasksRef = db.collection(`companies/${companyId}/tasks`);
  const listingsRef = db.collection(`companies/${companyId}/listings`);
  const monthStart = startOfCurrentMonth();

  const [
    totalLeadsAgg,
    newLeadsAgg,
    convertedLeadsAgg,
    totalTasksAgg,
    completedTasksAgg,
    listingsAgg,
    responseSnap,
    employeeSnap,
  ] = await Promise.all([
    leadsRef.where("assignedTo", "==", employeeUid).count().get(),
    leadsRef
      .where("assignedTo", "==", employeeUid)
      .where("createdAt", ">=", monthStart)
      .count()
      .get(),
    leadsRef
      .where("assignedTo", "==", employeeUid)
      .where("status", "==", "deal")
      .count()
      .get(),
    tasksRef.where("assignedTo", "==", employeeUid).count().get(),
    tasksRef
      .where("assignedTo", "==", employeeUid)
      .where("status", "==", "done")
      .count()
      .get(),
    listingsRef.where("assignedTo", "==", employeeUid).count().get(),
    leadsRef
      .where("assignedTo", "==", employeeUid)
      .where("responseTimeMinutes", ">=", 0)
      .select("responseTimeMinutes")
      .get(),
    db.doc(`companies/${companyId}/employees/${employeeUid}`).get(),
  ]);

  const employeeName =
    typeof employeeSnap.get("name") === "string"
      ? (employeeSnap.get("name") as string)
      : "موظف";

  let responseTotal = 0;
  let responseCount = 0;
  for (const doc of responseSnap.docs) {
    const v = doc.get("responseTimeMinutes");
    if (typeof v === "number" && v >= 0) {
      responseTotal += v;
      responseCount += 1;
    }
  }
  const avgResponseMinutes =
    responseCount > 0
      ? Math.round((responseTotal / responseCount) * 100) / 100
      : 0;

  const conversionRate =
    totalLeadsAgg.data().count > 0
      ? Math.round(
          (convertedLeadsAgg.data().count / totalLeadsAgg.data().count) * 10000,
        ) / 100
      : 0;

  const period = currentPeriod();

  await db.doc(`companies/${companyId}/kpi/employees_${employeeUid}`).set(
    {
      companyId,
      employeeUid,
      period,
      totalLeads: totalLeadsAgg.data().count,
      newLeadsThisMonth: newLeadsAgg.data().count,
      convertedLeads: convertedLeadsAgg.data().count,
      conversionRate,
      totalTasks: totalTasksAgg.data().count,
      completedTasks: completedTasksAgg.data().count,
      totalListings: listingsAgg.data().count,
      avgResponseMinutes,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Per-period history row consumed by the dashboard KPI table.
  // Doc id: {YYYY-MM}_{employeeId} so each month keeps its own snapshot.
  await db
    .doc(`companies/${companyId}/kpi_snapshots/${period}_${employeeUid}`)
    .set(
      {
        companyId,
        employeeId: employeeUid,
        employeeName,
        period,
        listingsActive: listingsAgg.data().count,
        leadsAssigned: totalLeadsAgg.data().count,
        leadsConverted: convertedLeadsAgg.data().count,
        conversionRate,
        avgResponseMinutes,
        tasksCompleted: completedTasksAgg.data().count,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export const refreshEmployeeKpiSnapshots = onSchedule(
  "every 60 minutes",
  async () => {
    const companiesSnap = await db.collection("companies").select().get();
    let processed = 0;

    for (const companyDoc of companiesSnap.docs) {
      const companyId = companyDoc.id;
      const employeesSnap = await db
        .collection(`companies/${companyId}/employees`)
        .where("active", "==", true)
        .select()
        .get();

      await Promise.all(
        employeesSnap.docs.map((empDoc) =>
          recomputeEmployeeKpi(companyId, empDoc.id),
        ),
      );
      processed += employeesSnap.size;
    }

    logger.info("Employee KPI snapshots refreshed", {
      employeesProcessed: processed,
    });
  },
);

export const onEmployeeWriteRefreshKpi = onDocumentWritten(
  "companies/{companyId}/employees/{uid}",
  async (event) => {
    const { companyId, uid } = event.params;
    // syncEmployeeClaims already handles claim sync; we do KPI here too
    await recomputeEmployeeKpi(companyId, uid);
  },
);

// ---------------------------------------------------------------------------
// Email notifications
// ---------------------------------------------------------------------------

/**
 * Creates a transporter from environment variables set in Firebase config.
 * Required variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * If any are missing the helper returns null and emails are skipped.
 */
function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.warn("SMTP not configured — email skipped.", { to: opts.to });
    return;
  }
  const from = process.env.EMAIL_FROM ?? "noreply@listingproperty.app";
  await transporter.sendMail({ from, ...opts });
}

/**
 * Triggered when a new lead is created. Sends an email to the company owner
 * and any active admin-role employees who have an email address.
 */
export const onLeadCreatedSendEmail = onDocumentCreated(
  "companies/{companyId}/leads/{leadId}",
  async (event) => {
    const companyId = event.params.companyId;
    const lead = event.data?.data() as Record<string, unknown> | undefined;
    if (!lead) return;

    const companySnap = await db.doc(`companies/${companyId}`).get();
    const company = companySnap.data() as Record<string, unknown> | undefined;
    const companyName =
      typeof company?.name === "string" ? company.name : "Your company";

    // Collect notification recipients: owner + active managers/admins
    const employeesSnap = await db
      .collection(`companies/${companyId}/employees`)
      .where("active", "==", true)
      .where("role", "in", ["company_owner", "company_admin", "manager"])
      .select("email", "displayName")
      .get();

    const emails = new Set<string>();
    for (const emp of employeesSnap.docs) {
      const email = emp.get("email");
      if (typeof email === "string" && email.includes("@")) {
        emails.add(email);
      }
    }

    if (emails.size === 0) {
      logger.info("No recipients for lead email", { companyId });
      return;
    }

    const leadName = typeof lead.name === "string" ? lead.name : "Unknown";
    const leadPhone = typeof lead.phone === "string" ? lead.phone : "—";
    const leadEmail = typeof lead.email === "string" ? lead.email : "—";
    const leadMessage = typeof lead.message === "string" ? lead.message : "—";
    const listingTitle =
      typeof lead.listingTitle === "string"
        ? lead.listingTitle
        : "General inquiry";

    const html = `
      <h2>New lead received — ${companyName}</h2>
      <p><strong>Name:</strong> ${leadName}</p>
      <p><strong>Phone:</strong> ${leadPhone}</p>
      <p><strong>Email:</strong> ${leadEmail}</p>
      <p><strong>Property:</strong> ${listingTitle}</p>
      <p><strong>Message:</strong> ${leadMessage}</p>
      <hr/>
      <p style="color:#666;font-size:12px">
        Log in to your dashboard to follow up on this lead.
      </p>
    `;

    for (const to of emails) {
      await sendEmail({
        to,
        subject: `New lead: ${leadName} — ${companyName}`,
        html,
      });
    }

    logger.info("Lead notification emails sent", {
      companyId,
      recipients: emails.size,
    });
  },
);

/**
 * Triggered when a task escalation notification is created.
 * Sends an email to the task assignee and managers.
 */
export const onTaskEscalationSendEmail = onDocumentCreated(
  "companies/{companyId}/notifications/{notificationId}",
  async (event) => {
    const companyId = event.params.companyId;
    const notification = event.data?.data() as
      | Record<string, unknown>
      | undefined;
    if (!notification || notification.type !== "task_escalated") return;

    const taskId =
      typeof notification.taskId === "string" ? notification.taskId : null;
    if (!taskId) return;

    const taskSnap = await db
      .doc(`companies/${companyId}/tasks/${taskId}`)
      .get();
    if (!taskSnap.exists) return;
    const task = taskSnap.data() as Record<string, unknown>;

    const companySnap = await db.doc(`companies/${companyId}`).get();
    const company = companySnap.data() as Record<string, unknown> | undefined;
    const companyName =
      typeof company?.name === "string" ? company.name : "Your company";

    // Notify the assignee and managers
    const assignedTo =
      typeof task.assignedTo === "string" ? task.assignedTo : null;
    const recipients = new Set<string>();

    if (assignedTo) {
      const empSnap = await db
        .doc(`companies/${companyId}/employees/${assignedTo}`)
        .get();
      if (empSnap.exists) {
        const email = empSnap.get("email");
        if (typeof email === "string" && email.includes("@")) {
          recipients.add(email);
        }
      }
    }

    const managersSnap = await db
      .collection(`companies/${companyId}/employees`)
      .where("active", "==", true)
      .where("role", "in", ["company_owner", "company_admin", "manager"])
      .select("email")
      .get();

    for (const mgr of managersSnap.docs) {
      const email = mgr.get("email");
      if (typeof email === "string" && email.includes("@")) {
        recipients.add(email);
      }
    }

    if (recipients.size === 0) return;

    const taskTitle = typeof task.title === "string" ? task.title : "A task";
    const html = `
      <h2>Task escalated — ${companyName}</h2>
      <p>The following task is overdue and has been escalated:</p>
      <p><strong>${taskTitle}</strong></p>
      <p>
        Assignee: ${typeof task.assignedToName === "string" ? task.assignedToName : "—"}
      </p>
      <hr/>
      <p style="color:#666;font-size:12px">
        Log in to your dashboard to review and update this task.
      </p>
    `;

    for (const to of recipients) {
      await sendEmail({
        to,
        subject: `Task escalated: ${taskTitle} — ${companyName}`,
        html,
      });
    }

    logger.info("Task escalation emails sent", {
      companyId,
      taskId,
      recipients: recipients.size,
    });
  },
);
