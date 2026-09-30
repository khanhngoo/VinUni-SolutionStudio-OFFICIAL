import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { applicationMembers, projectMembers, projects } from "@/db/schema";

export type ProjectMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function selectProjectByApplicationId(
  database: ProjectMutationDatabase,
  applicationId: bigint
) {
  const [project] = await database
    .select({ id: projects.id, publicId: projects.publicId })
    .from(projects)
    .where(eq(projects.applicationId, applicationId))
    .limit(1);
  return project ?? null;
}

/**
 * `projects.application_id` is unique, so a duplicate resolves to no row
 * rather than a thrown constraint error. Callers hold the application's
 * lifecycle lock; the index is the backstop, not the primary defense.
 */
export async function insertProjectForApplication(
  database: ProjectMutationDatabase,
  values: {
    applicationId: bigint;
    facultySupervisorId: bigint | null;
    now: Date;
    startDate: string | null;
  }
) {
  const [project] = await database
    .insert(projects)
    .values({
      applicationId: values.applicationId,
      createdAt: values.now,
      facultySupervisorId: values.facultySupervisorId,
      startDate: values.startDate,
      status: "ACTIVE",
      updatedAt: values.now,
    })
    .onConflictDoNothing({ target: projects.applicationId })
    .returning({ id: projects.id, publicId: projects.publicId });
  return project ?? null;
}

/**
 * Copies only authoritatively ACCEPTED application members into the project.
 * INVITED, DECLINED and REMOVED rows are never promoted.
 */
export async function insertProjectMembersFromAcceptedApplicationMembers(
  database: ProjectMutationDatabase,
  values: { applicationId: bigint; now: Date; projectId: bigint }
) {
  const accepted = await database
    .select({
      preferredRole: applicationMembers.preferredRole,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .where(
      and(
        eq(applicationMembers.applicationId, values.applicationId),
        eq(applicationMembers.status, "ACCEPTED")
      )
    );
  if (accepted.length === 0) return [];

  return database
    .insert(projectMembers)
    .values(
      accepted.map((member) => ({
        joinedAt: values.now,
        projectId: values.projectId,
        projectRole: member.preferredRole,
        studentId: member.studentId,
      }))
    )
    .returning({ studentId: projectMembers.studentId });
}
