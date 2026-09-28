import { db } from "@/db";
import {
  getCandidateAccessChallengeBySlug,
  insertCandidateAccessGrant,
  listCandidateAccessHistory,
  lockCandidateAccessChallenge,
  revokeCandidateAccessGrant,
  selectActiveStudentByExactEmail,
  selectCandidateAccessById,
  selectEffectiveCandidateAccess,
  studentHasChallengeApplication,
  type CandidateAccessChallenge,
  type ChallengeAccessDatabase,
} from "@/db/mutations/challenge-access";
import {
  hasOneOfActiveOrganizationRoles,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";

export type CandidateAccessErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class CandidateAccessError extends Error {
  constructor(
    public readonly code: CandidateAccessErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "CandidateAccessError";
  }
}

interface CandidateAccessOptions {
  database?: ChallengeAccessDatabase;
  now?: Date;
}

const OWNER_ACCESS_ROLES = ["ADMIN", "CONTACT_PERSON"] as const;
const ACCESSIBLE_CHALLENGE_STATUSES = new Set(["PUBLISHED", "APPLICATIONS_OPEN"]);

export interface CandidateAccessHistoryItem {
  canRevoke: boolean;
  expiresAt: Date;
  grantedAt: Date;
  grantedByName: string;
  hasApplication: boolean;
  id: bigint;
  revokedAt: Date | null;
  revokedByName: string | null;
  state: "APPLICATION_SUBMITTED" | "EFFECTIVE" | "EXPIRED" | "REVOKED";
  studentEmail: string;
  studentName: string;
}

export async function grantCandidateAccess(
  input: { candidateEmail: string; challengeSlug: string; expiresAt: Date },
  actor: AuthenticatedActor,
  options: CandidateAccessOptions = {}
) {
  const database = options.database ?? db;
  const now = options.now ?? new Date();
  const candidateEmail = input.candidateEmail.trim().toLowerCase();

  if (!candidateEmail || !candidateEmail.includes("@")) {
    throw invalidCandidate();
  }
  if (Number.isNaN(input.expiresAt.getTime()) || input.expiresAt <= now) {
    throw new CandidateAccessError(
      "VALIDATION_ERROR",
      "Choose an expiry later than the current server time."
    );
  }

  return withCandidateAccessTransaction(database, async (tx) => {
    const initial = await requireChallenge(tx, input.challengeSlug);
    await lockCandidateAccessChallenge(tx, initial.id);
    const challenge = await requireChallenge(tx, input.challengeSlug);
    assertOwnerCanManageAccess(challenge, actor);
    assertChallengeCanGrantAccess(challenge, now);

    if (!challenge.applicationDeadline || input.expiresAt > challenge.applicationDeadline) {
      throw new CandidateAccessError(
        "VALIDATION_ERROR",
        "Access expiry must be on or before the challenge application deadline."
      );
    }

    const student = await selectActiveStudentByExactEmail(tx, candidateEmail);
    if (!student) throw invalidCandidate();

    if (await studentHasChallengeApplication(tx, challenge.id, student.studentId)) {
      throw new CandidateAccessError(
        "CONFLICT",
        "This candidate already has a durable application for the challenge."
      );
    }

    const existing = await selectEffectiveCandidateAccess(
      tx,
      challenge.id,
      student.studentId,
      now
    );
    if (existing) return existing;

    return insertCandidateAccessGrant(tx, {
      challengeId: challenge.id,
      expiresAt: input.expiresAt,
      grantedAt: now,
      grantedBy: actor.user.userId,
      studentId: student.studentId,
    });
  });
}

export async function revokeCandidateAccess(
  input: { accessId: bigint; challengeSlug: string },
  actor: AuthenticatedActor,
  options: CandidateAccessOptions = {}
) {
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  return withCandidateAccessTransaction(database, async (tx) => {
    const initial = await requireChallenge(tx, input.challengeSlug);
    await lockCandidateAccessChallenge(tx, initial.id);
    const challenge = await requireChallenge(tx, input.challengeSlug);
    assertOwnerCanManageAccess(challenge, actor);

    const grant = await selectCandidateAccessById(tx, challenge.id, input.accessId);
    if (!grant) throw new CandidateAccessError("NOT_FOUND", "Access grant was not found.");
    if (grant.revokedAt) return grant;

    if (await studentHasChallengeApplication(tx, challenge.id, grant.studentId)) {
      throw new CandidateAccessError(
        "CONFLICT",
        "Access cannot be revoked after the candidate has submitted an application."
      );
    }

    const revoked = await revokeCandidateAccessGrant(tx, {
      accessId: grant.id,
      revokedAt: now,
      revokedBy: actor.user.userId,
    });
    if (!revoked) {
      throw new CandidateAccessError(
        "CONFLICT",
        "Access was changed by another request. Refresh and try again."
      );
    }
    return revoked;
  });
}

export async function listChallengeCandidateAccess(
  challengeSlug: string,
  actor: AuthenticatedActor,
  options: CandidateAccessOptions = {}
): Promise<CandidateAccessHistoryItem[]> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();
  const challenge = await requireChallenge(database, challengeSlug);
  assertOwnerCanManageAccess(challenge, actor);

  const history = await listCandidateAccessHistory(database, challenge.id);
  return Promise.all(
    history.map(async (row) => {
      const hasApplication = await studentHasChallengeApplication(
        database,
        challenge.id,
        row.studentId
      );
      const state = row.revokedAt
        ? "REVOKED"
        : hasApplication
          ? "APPLICATION_SUBMITTED"
          : row.expiresAt < now
            ? "EXPIRED"
            : "EFFECTIVE";

      return {
        canRevoke: state === "EFFECTIVE",
        expiresAt: row.expiresAt,
        grantedAt: row.grantedAt,
        grantedByName: row.grantedByName,
        hasApplication,
        id: row.id,
        revokedAt: row.revokedAt,
        revokedByName: row.revokedByName,
        state,
        studentEmail: row.studentEmail,
        studentName: row.studentName,
      };
    })
  );
}

/**
 * INVITE_ONLY detail access is candidate-specific until an application row
 * exists. Application membership then becomes the durable downstream basis.
 */
export async function canStudentAccessInviteOnlyChallenge(
  challengeSlug: string,
  studentId: bigint,
  options: CandidateAccessOptions = {}
) {
  const database = options.database ?? db;
  const now = options.now ?? new Date();
  const challenge = await getCandidateAccessChallengeBySlug(database, challengeSlug);
  if (!challenge || challenge.visibility !== "INVITE_ONLY") return false;
  if (!ACCESSIBLE_CHALLENGE_STATUSES.has(challenge.status)) return false;

  if (await studentHasChallengeApplication(database, challenge.id, studentId)) {
    return true;
  }
  if (!challenge.applicationDeadline || now > challenge.applicationDeadline) {
    return false;
  }

  return Boolean(
    await selectEffectiveCandidateAccess(database, challenge.id, studentId, now)
  );
}

function assertOwnerCanManageAccess(
  challenge: CandidateAccessChallenge,
  actor: AuthenticatedActor
) {
  if (
    !hasOneOfActiveOrganizationRoles(
      actor,
      challenge.ownerOrganizationId,
      OWNER_ACCESS_ROLES
    )
  ) {
    throw new CandidateAccessError(
      "FORBIDDEN",
      "Actor cannot manage candidate access for this challenge."
    );
  }
}

function assertChallengeCanGrantAccess(
  challenge: CandidateAccessChallenge,
  now: Date
) {
  if (challenge.visibility !== "INVITE_ONLY") {
    throw new CandidateAccessError(
      "VALIDATION_ERROR",
      "Candidate-specific access is available only for INVITE_ONLY challenges."
    );
  }
  if (!ACCESSIBLE_CHALLENGE_STATUSES.has(challenge.status)) {
    throw new CandidateAccessError(
      "CONFLICT",
      "Publish the INVITE_ONLY challenge before granting candidate access."
    );
  }
  if (!challenge.applicationDeadline || now > challenge.applicationDeadline) {
    throw new CandidateAccessError(
      "CONFLICT",
      "The challenge application window is closed."
    );
  }
}

async function requireChallenge(database: ChallengeAccessDatabase, slug: string) {
  const challenge = await getCandidateAccessChallengeBySlug(database, slug);
  if (!challenge) {
    throw new CandidateAccessError("NOT_FOUND", "Challenge was not found.");
  }
  return challenge;
}

function invalidCandidate() {
  return new CandidateAccessError(
    "VALIDATION_ERROR",
    "Candidate identity could not be verified as an active VinUni student."
  );
}

async function withCandidateAccessTransaction<T>(
  database: ChallengeAccessDatabase,
  callback: (tx: ChallengeAccessDatabase) => Promise<T>
) {
  if ("rollback" in database && typeof database.rollback === "function") {
    return callback(database);
  }
  return database.transaction((tx) => callback(tx));
}
