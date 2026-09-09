import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { projects, supervisionRequests } from "@/db/schema";

export type SupervisionMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SupervisionResponseRead {
  applicationId: bigint;
  facultyId: bigint;
  id: bigint;
  status: string;
}

/**
 * Answers an outstanding supervision request.
 *
 * The state machine lives in the WHERE clause: only a request that is still
 * PENDING and still belongs to this supervisor can be answered. A null return
 * therefore means someone else already answered it, or it was never theirs to
 * answer — the caller raises a conflict rather than the two racing writes both
 * appearing to succeed.
 */
export async function respondToPendingSupervisionRequest(
  database: SupervisionMutationDatabase,
  input: {
    facultyId: bigint;
    now: Date;
    requestId: bigint;
    status: "ACCEPTED" | "DECLINED";
  }
): Promise<SupervisionResponseRead | null> {
  const [request] = await database
    .update(supervisionRequests)
    .set({
      respondedAt: input.now,
      status: input.status,
    })
    .where(
      and(
        eq(supervisionRequests.id, input.requestId),
        eq(supervisionRequests.facultyId, input.facultyId),
        eq(supervisionRequests.status, "PENDING")
      )
    )
    .returning({
      applicationId: supervisionRequests.applicationId,
      facultyId: supervisionRequests.facultyId,
      id: supervisionRequests.id,
      status: sql<string>`coalesce(${supervisionRequests.status}, 'PENDING')`,
    });

  return request ?? null;
}

/**
 * How many unfinished projects this supervisor is already carrying.
 *
 * Counted at the moment of the decision rather than read from a stored tally,
 * so two requests accepted in the same second cannot both pass a stale check.
 */
export async function countActiveSupervisions(
  database: SupervisionMutationDatabase,
  facultyId: bigint
): Promise<number> {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(
      and(
        eq(projects.facultySupervisorId, facultyId),
        sql`${projects.status} in ('ACTIVE', 'PAUSED', 'FINAL_REVIEW')`
      )
    );

  return row?.count ?? 0;
}
