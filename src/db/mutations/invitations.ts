import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { applicationMembers, applications } from "@/db/schema";

export type InvitationMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface InvitationResponseRead {
  applicationId: bigint;
  memberId: bigint;
  status: string;
}

/**
 * Answers a team invitation.
 *
 * The state machine is in the WHERE clause: only a membership that is still
 * INVITED, and belongs to this student, on this application, can be answered.
 * A null return therefore covers every way this can legitimately fail --
 * already answered, never theirs, wrong application -- and the caller raises
 * one conflict rather than trying to distinguish them and leaking which.
 */
export async function respondToTeamInvitation(
  database: InvitationMutationDatabase,
  input: {
    applicationPublicId: string;
    now: Date;
    status: "ACCEPTED" | "DECLINED";
    studentId: bigint;
  }
): Promise<InvitationResponseRead | null> {
  const [application] = await database
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.publicId, input.applicationPublicId))
    .limit(1);

  if (!application) return null;

  const [member] = await database
    .update(applicationMembers)
    .set({
      respondedAt: input.now,
      status: input.status,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(applicationMembers.applicationId, application.id),
        eq(applicationMembers.studentId, input.studentId),
        eq(applicationMembers.status, "INVITED")
      )
    )
    .returning({
      applicationId: applicationMembers.applicationId,
      memberId: applicationMembers.id,
      status: sql<string>`coalesce(${applicationMembers.status}, 'INVITED')`,
    });

  return member ?? null;
}
