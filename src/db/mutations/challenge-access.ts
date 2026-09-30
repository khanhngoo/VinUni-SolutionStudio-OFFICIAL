import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challengeCandidateAccess,
  challenges,
  studentProfiles,
  users,
} from "@/db/schema";

export type ChallengeAccessDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CandidateAccessChallenge {
  applicationDeadline: Date | null;
  id: bigint;
  ownerOrganizationId: bigint;
  slug: string | null;
  status: NonNullable<typeof challenges.$inferSelect.status>;
  visibility: NonNullable<typeof challenges.$inferSelect.visibility>;
}

export async function getCandidateAccessChallengeBySlug(
  database: ChallengeAccessDatabase,
  slug: string
): Promise<CandidateAccessChallenge | null> {
  const [challenge] = await database
    .select({
      applicationDeadline: challenges.applicationDeadline,
      id: challenges.id,
      ownerOrganizationId: challenges.ownerOrganizationId,
      slug: challenges.slug,
      status: sql<CandidateAccessChallenge["status"]>`coalesce(${challenges.status}, 'DRAFT')`,
      visibility: sql<CandidateAccessChallenge["visibility"]>`coalesce(${challenges.visibility}, 'VINUNI_ONLY')`,
    })
    .from(challenges)
    .where(eq(challenges.slug, slug.trim()))
    .limit(1);

  return challenge ?? null;
}

/** Serializes grant, revoke, and INVITE_ONLY application creation per challenge. */
export async function lockCandidateAccessChallenge(
  database: ChallengeAccessDatabase,
  challengeId: bigint
) {
  await database.execute(
    sql`select ${challenges.id} from ${challenges} where ${challenges.id} = ${challengeId} for update`
  );
}

export async function selectActiveStudentByExactEmail(
  database: ChallengeAccessDatabase,
  email: string
) {
  const [student] = await database
    .select({
      email: users.email,
      fullName: users.fullName,
      studentId: studentProfiles.userId,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(
      and(
        sql`lower(${users.email}) = lower(${email.trim()})`,
        eq(users.status, "ACTIVE")
      )
    )
    .limit(1);

  return student ?? null;
}

export async function selectEffectiveCandidateAccess(
  database: ChallengeAccessDatabase,
  challengeId: bigint,
  studentId: bigint,
  at: Date
) {
  const [grant] = await database
    .select()
    .from(challengeCandidateAccess)
    .where(
      and(
        eq(challengeCandidateAccess.challengeId, challengeId),
        eq(challengeCandidateAccess.studentId, studentId),
        isNull(challengeCandidateAccess.revokedAt),
        lte(challengeCandidateAccess.grantedAt, at),
        gte(challengeCandidateAccess.expiresAt, at)
      )
    )
    .orderBy(asc(challengeCandidateAccess.id))
    .limit(1);

  return grant ?? null;
}

export async function selectEffectiveCandidateAccessStudentIds(
  database: ChallengeAccessDatabase,
  challengeId: bigint,
  studentIds: bigint[],
  at: Date
) {
  if (studentIds.length === 0) return [];

  const rows = await database
    .selectDistinct({ studentId: challengeCandidateAccess.studentId })
    .from(challengeCandidateAccess)
    .where(
      and(
        eq(challengeCandidateAccess.challengeId, challengeId),
        inArray(challengeCandidateAccess.studentId, studentIds),
        isNull(challengeCandidateAccess.revokedAt),
        lte(challengeCandidateAccess.grantedAt, at),
        gte(challengeCandidateAccess.expiresAt, at)
      )
    );

  return rows.map((row) => row.studentId);
}

export async function insertCandidateAccessGrant(
  database: ChallengeAccessDatabase,
  input: {
    challengeId: bigint;
    expiresAt: Date;
    grantedAt: Date;
    grantedBy: bigint;
    studentId: bigint;
  }
) {
  const [grant] = await database
    .insert(challengeCandidateAccess)
    .values(input)
    .returning();

  if (!grant) throw new Error("Candidate access grant was not created.");
  return grant;
}

export async function selectCandidateAccessById(
  database: ChallengeAccessDatabase,
  challengeId: bigint,
  accessId: bigint
) {
  const [grant] = await database
    .select()
    .from(challengeCandidateAccess)
    .where(
      and(
        eq(challengeCandidateAccess.id, accessId),
        eq(challengeCandidateAccess.challengeId, challengeId)
      )
    )
    .limit(1);

  return grant ?? null;
}

export async function revokeCandidateAccessGrant(
  database: ChallengeAccessDatabase,
  input: { accessId: bigint; revokedAt: Date; revokedBy: bigint }
) {
  const [grant] = await database
    .update(challengeCandidateAccess)
    .set({
      revokedAt: input.revokedAt,
      revokedBy: input.revokedBy,
      updatedAt: input.revokedAt,
    })
    .where(
      and(
        eq(challengeCandidateAccess.id, input.accessId),
        isNull(challengeCandidateAccess.revokedAt)
      )
    )
    .returning();

  return grant ?? null;
}

export async function studentHasChallengeApplication(
  database: ChallengeAccessDatabase,
  challengeId: bigint,
  studentId: bigint
) {
  const [row] = await database
    .select({ id: applications.id })
    .from(applications)
    .innerJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, applications.id),
        eq(applicationMembers.studentId, studentId)
      )
    )
    .where(eq(applications.challengeId, challengeId))
    .limit(1);

  return Boolean(row);
}

export async function listCandidateAccessHistory(
  database: ChallengeAccessDatabase,
  challengeId: bigint
) {
  const student = alias(users, "candidate_access_student");
  const grantor = alias(users, "candidate_access_grantor");
  const revoker = alias(users, "candidate_access_revoker");

  return database
    .select({
      createdAt: challengeCandidateAccess.createdAt,
      expiresAt: challengeCandidateAccess.expiresAt,
      grantedAt: challengeCandidateAccess.grantedAt,
      grantedByEmail: grantor.email,
      grantedByName: grantor.fullName,
      id: challengeCandidateAccess.id,
      revokedAt: challengeCandidateAccess.revokedAt,
      revokedByEmail: revoker.email,
      revokedByName: revoker.fullName,
      studentEmail: student.email,
      studentId: challengeCandidateAccess.studentId,
      studentName: student.fullName,
      updatedAt: challengeCandidateAccess.updatedAt,
    })
    .from(challengeCandidateAccess)
    .innerJoin(student, eq(student.id, challengeCandidateAccess.studentId))
    .innerJoin(grantor, eq(grantor.id, challengeCandidateAccess.grantedBy))
    .leftJoin(revoker, eq(revoker.id, challengeCandidateAccess.revokedBy))
    .where(eq(challengeCandidateAccess.challengeId, challengeId))
    .orderBy(asc(challengeCandidateAccess.grantedAt), asc(challengeCandidateAccess.id));
}
