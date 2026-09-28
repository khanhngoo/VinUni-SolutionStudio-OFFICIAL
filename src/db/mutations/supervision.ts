import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  facultyProfiles,
  projects,
  supervisionRequests,
  users,
} from "@/db/schema";

export type SupervisionMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SupervisionResponseRead {
  applicationId: bigint;
  facultyId: bigint;
  id: bigint;
  status: string;
}

export interface SupervisionRequestWriteRead {
  applicationId: bigint;
  facultyId: bigint;
  id: bigint;
  requestedBy: bigint;
  respondBy: Date;
  status: string;
}

export async function selectActiveFacultyForSupervision(
  database: SupervisionMutationDatabase,
  facultyId: bigint
) {
  const [faculty] = await database
    .select({ userId: facultyProfiles.userId })
    .from(facultyProfiles)
    .innerJoin(users, eq(users.id, facultyProfiles.userId))
    .where(and(eq(facultyProfiles.userId, facultyId), eq(users.status, "ACTIVE")))
    .limit(1);

  return faculty ?? null;
}

export async function insertSupervisionRequest(
  database: SupervisionMutationDatabase,
  input: {
    applicationId: bigint;
    comments?: string | null;
    facultyId: bigint;
    requestedAt: Date;
    requestedBy: bigint;
    respondBy: Date;
  }
): Promise<SupervisionRequestWriteRead> {
  const [request] = await database
    .insert(supervisionRequests)
    .values({
      applicationId: input.applicationId,
      comments: input.comments ?? null,
      facultyId: input.facultyId,
      requestedAt: input.requestedAt,
      requestedBy: input.requestedBy,
      respondBy: input.respondBy,
      status: "PENDING",
    })
    .returning({
      applicationId: supervisionRequests.applicationId,
      facultyId: supervisionRequests.facultyId,
      id: supervisionRequests.id,
      requestedBy: supervisionRequests.requestedBy,
      respondBy: supervisionRequests.respondBy,
      status: sql<string>`coalesce(${supervisionRequests.status}, 'PENDING')`,
    });

  if (!request?.respondBy) {
    throw new Error("A new supervision request must have a response deadline.");
  }

  return { ...request, respondBy: request.respondBy };
}

/** Serializes reroute/reissue attempts for one application. */
export async function lockApplicationForSupervision(
  database: SupervisionMutationDatabase,
  applicationId: bigint
) {
  await database.execute(
    sql`select ${applications.id} from ${applications} where ${applications.id} = ${applicationId} for update`
  );
}

export async function listSupervisionRequestsForWrite(
  database: SupervisionMutationDatabase,
  applicationId: bigint
) {
  return database
    .select({
      facultyId: supervisionRequests.facultyId,
      id: supervisionRequests.id,
      respondBy: supervisionRequests.respondBy,
      status: sql<string>`coalesce(${supervisionRequests.status}, 'PENDING')`,
    })
    .from(supervisionRequests)
    .where(eq(supervisionRequests.applicationId, applicationId))
    .orderBy(desc(supervisionRequests.requestedAt), desc(supervisionRequests.id));
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
        eq(supervisionRequests.status, "PENDING"),
        gte(supervisionRequests.respondBy, input.now)
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
