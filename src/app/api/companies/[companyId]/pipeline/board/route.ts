import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canViewAssignedLeads,
  getLeadsVisibility,
  resolveLeadListScope,
} from "@/lib/api/company-leads";
import { loadStages, mapBoardLead } from "@/lib/api/pipeline";
import { BOARD_COLUMN_LIMIT } from "@/constants/pipeline";
import { adminDb } from "@/lib/firebase/admin";
import type { BoardLead } from "@/types/pipeline";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

/**
 * The Kanban board payload: stages + leads grouped per column, ordered by
 * boardOrder. Respects the same own-vs-all visibility split as the leads
 * list — view_own_leads users only see their assigned cards.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const visibility = await getLeadsVisibility(companyId);
  const scope = resolveLeadListScope(user, companyId, visibility);

  const stages = await loadStages(companyId);
  const stageKeys = new Set(stages.map((s) => s.key));

  let leadsQuery: FirebaseFirestore.Query = adminDb().collection(
    `companies/${companyId}/leads`,
  );

  if (scope === "own") {
    leadsQuery = leadsQuery.where("assignedTo", "==", user.uid);
  } else {
    const assignedToParam = req.nextUrl.searchParams.get("assignedTo");
    if (assignedToParam !== null) {
      const value = assignedToParam.trim();
      leadsQuery = leadsQuery.where(
        "assignedTo",
        "==",
        value.length > 0 ? value : null,
      );
    }
  }

  // One recency-bounded fetch, grouped in memory: per-column Firestore
  // queries would need a composite index per filter combination and N reads.
  const snap = await leadsQuery
    .orderBy("createdAt", "desc")
    .limit(BOARD_COLUMN_LIMIT * Math.max(stages.length, 1) * 2)
    .get();

  const columns: Record<string, BoardLead[]> = {};
  for (const stage of stages) {
    columns[stage.key] = [];
  }
  for (const doc of snap.docs) {
    const lead = mapBoardLead(
      doc.id,
      doc.data() as Record<string, unknown>,
      stageKeys,
    );
    const column = columns[lead.stageKey];
    if (column && column.length < BOARD_COLUMN_LIMIT) {
      column.push(lead);
    }
  }
  for (const key of Object.keys(columns)) {
    columns[key]!.sort((a, b) => a.boardOrder - b.boardOrder);
  }

  return NextResponse.json({ stages, columns });
}
