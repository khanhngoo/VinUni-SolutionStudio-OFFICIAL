import "dotenv/config";

import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  challengeCandidateAccess,
  challenges,
  organizations,
  supervisionRequests,
} from "@/db/schema";
import {
  CandidateAccessError,
  canStudentAccessInviteOnlyChallenge,
  grantCandidateAccess,
  listChallengeCandidateAccess,
  revokeCandidateAccess,
} from "@/services/challenge-access.service";
import {
  createApplication,
  getApplicationDetail,
  toApplicationActorContext,
} from "@/services/application.service";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { getAuthenticatedActorForVerification } from "./_actor";

const SLUG = "qa-663-invite-access-service";
const ROLLBACK = Symbol("rollback candidate access verification");

async function main() {
  const baseline = await counts();
  const [owner, unrelatedPartner, bao, jordan, priya, hoang, faculty] =
    await Promise.all([
      getAuthenticatedActorForVerification("contact.bencang.demo@example.test"),
      getAuthenticatedActorForVerification("contact.vhf.demo@example.test"),
      getAuthenticatedActorForVerification("student.bao-tran.demo@example.test"),
      getAuthenticatedActorForVerification("student.jordan-lee.demo@example.test"),
      getAuthenticatedActorForVerification("student.priya-raman.demo@example.test"),
      getAuthenticatedActorForVerification("student.hoang-tran.demo@example.test"),
      getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test"),
    ]);

  const ownerOrganizationId = owner.memberships.find(
    (membership) => membership.organizationType === "EXTERNAL_PARTNER"
  )?.organizationId;
  if (!ownerOrganizationId) throw new Error("Owner partner organization missing.");

  const [managingOrganization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, "CAID"))
    .limit(1);
  if (!managingOrganization) throw new Error("CAID organization missing.");

  const startedAt = new Date();
  const deadline = plusDays(startedAt, 10);
  let applicationPublicId: string | null = null;
  let disposableChallengeId: bigint | null = null;

  try {
    const [challenge] = await db
      .insert(challenges)
      .values({
        applicationDeadline: deadline,
        contactPersonId: owner.user.userId,
        description: "Disposable INVITE_ONLY candidate-access verification challenge.",
        managingOrganizationId: managingOrganization.id,
        ownerOrganizationId,
        slug: SLUG,
        status: "APPLICATIONS_OPEN",
        summary: "Disposable candidate access verification.",
        teamSizeMax: 1,
        teamSizeMin: 1,
        title: "QA 663 invite access service",
        visibility: "INVITE_ONLY",
        weeklyHours: 8,
      })
      .returning({ id: challenges.id });
    if (!challenge) throw new Error("Disposable challenge was not created.");
    disposableChallengeId = challenge.id;

    const baoGrant = await grantCandidateAccess(
      {
        candidateEmail: bao.user.email,
        challengeSlug: SLUG,
        expiresAt: plusDays(startedAt, 5),
      },
      owner,
      { now: startedAt }
    );
    assert(
      await canStudentAccessInviteOnlyChallenge(SLUG, bao.user.userId, {
        now: startedAt,
      }),
      "owner grant should give the exact student access"
    );

    await expectAccessError(
      () =>
        grantCandidateAccess(
          {
            candidateEmail: jordan.user.email,
            challengeSlug: SLUG,
            expiresAt: plusDays(startedAt, 5),
          },
          unrelatedPartner,
          { now: startedAt }
        ),
      "FORBIDDEN"
    );

    const nonStudentMessage = await expectAccessError(
      () =>
        grantCandidateAccess(
          {
            candidateEmail: faculty.user.email,
            challengeSlug: SLUG,
            expiresAt: plusDays(startedAt, 5),
          },
          owner,
          { now: startedAt }
        ),
      "VALIDATION_ERROR"
    );
    const unknownMessage = await expectAccessError(
      () =>
        grantCandidateAccess(
          {
            candidateEmail: "not-a-known-candidate@example.test",
            challengeSlug: SLUG,
            expiresAt: plusDays(startedAt, 5),
          },
          owner,
          { now: startedAt }
        ),
      "VALIDATION_ERROR"
    );
    assert(
      nonStudentMessage === unknownMessage,
      "unknown and non-student identities should have the same safe response"
    );

    await expectAccessError(
      () =>
        grantCandidateAccess(
          {
            candidateEmail: priya.user.email,
            challengeSlug: SLUG,
            expiresAt: plusDays(deadline, 1),
          },
          owner,
          { now: startedAt }
        ),
      "VALIDATION_ERROR"
    );

    const duplicate = await grantCandidateAccess(
      {
        candidateEmail: bao.user.email,
        challengeSlug: SLUG,
        expiresAt: plusDays(startedAt, 4),
      },
      owner,
      { now: startedAt }
    );
    assert(duplicate.id === baoGrant.id, "duplicate effective grant should be idempotent");
    assert(
      (await effectiveCount(challenge.id, bao.user.userId, startedAt)) === 1,
      "duplicate retry should retain exactly one effective grant"
    );

    const concurrent = await Promise.all([
      grantCandidateAccess(
        {
          candidateEmail: jordan.user.email,
          challengeSlug: SLUG,
          expiresAt: plusDays(startedAt, 5),
        },
        owner,
        { now: startedAt }
      ),
      grantCandidateAccess(
        {
          candidateEmail: jordan.user.email,
          challengeSlug: SLUG,
          expiresAt: plusDays(startedAt, 5),
        },
        owner,
        { now: startedAt }
      ),
    ]);
    assert(concurrent[0].id === concurrent[1].id, "concurrent grants should converge");
    assert(
      (await effectiveCount(challenge.id, jordan.user.userId, startedAt)) === 1,
      "concurrent grants should create one effective row"
    );

    await revokeCandidateAccess(
      { accessId: baoGrant.id, challengeSlug: SLUG },
      owner,
      { now: plusMinutes(startedAt, 1) }
    );
    const [revoked] = await db
      .select({ revokedAt: challengeCandidateAccess.revokedAt, revokedBy: challengeCandidateAccess.revokedBy })
      .from(challengeCandidateAccess)
      .where(eq(challengeCandidateAccess.id, baoGrant.id));
    assert(
      revoked?.revokedAt?.getTime() === plusMinutes(startedAt, 1).getTime() &&
        revoked.revokedBy === owner.user.userId,
      "revocation should persist authoritative actor and time"
    );
    assert(
      !(await canStudentAccessInviteOnlyChallenge(SLUG, bao.user.userId, {
        now: plusMinutes(startedAt, 1),
      })),
      "revoked pre-application candidate should lose access"
    );

    await grantCandidateAccess(
      {
        candidateEmail: priya.user.email,
        challengeSlug: SLUG,
        expiresAt: plusMinutes(startedAt, 2),
      },
      owner,
      { now: plusMinutes(startedAt, 1) }
    );
    assert(
      !(await canStudentAccessInviteOnlyChallenge(SLUG, priya.user.userId, {
        now: plusMinutes(startedAt, 3),
      })),
      "expired grant should not authorize challenge access"
    );

    const baoRegrant = await grantCandidateAccess(
      {
        candidateEmail: bao.user.email,
        challengeSlug: SLUG,
        expiresAt: plusDays(startedAt, 5),
      },
      owner,
      { now: plusMinutes(startedAt, 2) }
    );
    assert(baoRegrant.id !== baoGrant.id, "re-grant should append history");

    const created = await createApplication(
      {
        challengeSlug: SLUG,
        facultySupervisorId: faculty.user.userId,
        leaderCommittedHoursPerWeek: 8,
        motivation: "Disposable INVITE_ONLY lifecycle verification.",
        teamName: "Invite access QA",
      },
      toApplicationActorContext(bao),
      { now: plusMinutes(startedAt, 3) }
    );
    applicationPublicId = created.publicId;

    await expectAccessError(
      () =>
        revokeCandidateAccess(
          { accessId: baoRegrant.id, challengeSlug: SLUG },
          owner,
          { now: plusMinutes(startedAt, 4) }
        ),
      "CONFLICT"
    );
    assert(
      await canStudentAccessInviteOnlyChallenge(SLUG, bao.user.userId, {
        now: plusDays(startedAt, 6),
      }),
      "application membership should remain a durable access basis after grant expiry"
    );
    assert(
      Boolean(
        await getApplicationDetail(
          created.publicId,
          toApplicationActorContext(bao)
        )
      ),
      "application should survive source grant expiry"
    );

    const invitedDetail = await getMarketplaceChallengeBySlug(
      SLUG,
      marketplaceContextForActor(bao)
    );
    const unrelatedDetail = await getMarketplaceChallengeBySlug(
      SLUG,
      marketplaceContextForActor(hoang)
    );
    assert(invitedDetail?.slug === SLUG, "invited/application student should resolve detail");
    assert(unrelatedDetail === null, "unrelated student should not resolve detail");

    const beforeRollback = await accessCount(challenge.id);
    try {
      await db.transaction(async (tx) => {
        await grantCandidateAccess(
          {
            candidateEmail: hoang.user.email,
            challengeSlug: SLUG,
            expiresAt: plusDays(startedAt, 5),
          },
          owner,
          { database: tx, now: plusMinutes(startedAt, 4) }
        );
        throw ROLLBACK;
      });
    } catch (error) {
      if (error !== ROLLBACK) throw error;
    }
    assert(
      (await accessCount(challenge.id)) === beforeRollback,
      "rolled-back grant should leave no partial access row"
    );

    const history = await listChallengeCandidateAccess(SLUG, owner, {
      now: plusDays(startedAt, 6),
    });
    assert(history.length === 4, "grant, revoke, expiry, and re-grant history should remain");
    assert(
      history.some((item) => item.state === "APPLICATION_SUBMITTED"),
      "history should derive durable application state"
    );
    assert(
      history.some(
        (item) => item.id === baoGrant.id && item.state === "REVOKED"
      ),
      "a prior revoked row should remain visibly revoked after a later application"
    );
    assert(
      history.some(
        (item) =>
          item.studentEmail === priya.user.email && item.state === "EXPIRED"
      ),
      "expired pre-application history should remain visibly expired"
    );

    console.log("Candidate access runtime verification passed.");
  } finally {
    await db.transaction(async (tx) => {
      if (disposableChallengeId) {
        await tx
          .delete(applications)
          .where(eq(applications.challengeId, disposableChallengeId));
      }
      await tx.delete(challenges).where(eq(challenges.slug, SLUG));
    });
  }

  const after = await counts();
  assert(after.challenges === baseline.challenges, "challenge baseline should be restored");
  assert(after.applications === baseline.applications, "application baseline should be restored");
  assert(after.access === baseline.access, "candidate-access baseline should be restored");
  assert(
    after.supervisionRequests === baseline.supervisionRequests,
    "supervision-request baseline should be restored"
  );
  if (applicationPublicId) {
    const [leftover] = await db
      .select({ total: count() })
      .from(applications)
      .where(eq(applications.publicId, applicationPublicId));
    assert(Number(leftover?.total ?? 0) === 0, "disposable application should be removed");
  }
  console.log("Disposable candidate-access QA rows removed; baselines restored.");
  process.exit(0);
}

async function effectiveCount(challengeId: bigint, studentId: bigint, at: Date) {
  const [row] = await db
    .select({ total: count() })
    .from(challengeCandidateAccess)
    .where(
      and(
        eq(challengeCandidateAccess.challengeId, challengeId),
        eq(challengeCandidateAccess.studentId, studentId),
        sql`${challengeCandidateAccess.revokedAt} is null`,
        sql`${challengeCandidateAccess.grantedAt} <= ${at}`,
        sql`${challengeCandidateAccess.expiresAt} >= ${at}`
      )
    );
  return Number(row?.total ?? 0);
}

async function accessCount(challengeId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(challengeCandidateAccess)
    .where(eq(challengeCandidateAccess.challengeId, challengeId));
  return Number(row?.total ?? 0);
}

async function counts() {
  const [challengeRows, applicationRows, accessRows, supervisionRows] =
    await Promise.all([
      db.select({ total: count() }).from(challenges),
      db.select({ total: count() }).from(applications),
      db.select({ total: count() }).from(challengeCandidateAccess),
      db.select({ total: count() }).from(supervisionRequests),
    ]);
  return {
    access: Number(accessRows[0]?.total ?? 0),
    applications: Number(applicationRows[0]?.total ?? 0),
    challenges: Number(challengeRows[0]?.total ?? 0),
    supervisionRequests: Number(supervisionRows[0]?.total ?? 0),
  };
}

async function expectAccessError(
  operation: () => Promise<unknown>,
  code: CandidateAccessError["code"]
) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof CandidateAccessError && error.code === code) {
      return error.message;
    }
    throw error;
  }
  throw new Error(`Expected CandidateAccessError ${code}.`);
}

function plusMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function plusDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 86_400_000);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
