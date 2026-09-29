import "dotenv/config";

import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentQuestions,
  assessmentSections,
  assessments,
  challenges,
  organizations,
  supervisionRequests,
} from "@/db/schema";
import { updateApplicationStatus } from "@/db/mutations/applications";
import {
  ApplicationError,
  createApplication,
  getApplicationDetail,
  toApplicationActorContext,
} from "@/services/application.service";
import {
  ApplicationLifecycleError,
  deriveApplicationLifecycleView,
  progressApplicationAfterGateChange,
  withdrawApplication,
} from "@/services/application-lifecycle.service";
import {
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "@/services/assessment.service";
import { respondToInvitation, InvitationError } from "@/services/invitation.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const PREFIX = "qa-664-";
const ROLLBACK = Symbol("rollback application lifecycle verification");

async function main() {
  await cleanup();
  const baseline = await counts();
  const [owner, bao, jordan, priya, hoang, faculty] = await Promise.all([
    getAuthenticatedActorForVerification("contact.bencang.demo@example.test"),
    getAuthenticatedActorForVerification("student.bao-tran.demo@example.test"),
    getAuthenticatedActorForVerification("student.jordan-lee.demo@example.test"),
    getAuthenticatedActorForVerification("student.priya-raman.demo@example.test"),
    getAuthenticatedActorForVerification("student.hoang-tran.demo@example.test"),
    getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test"),
  ]);
  const actors = {
    bao: toApplicationActorContext(bao),
    hoang: toApplicationActorContext(hoang),
    jordan: toApplicationActorContext(jordan),
    priya: toApplicationActorContext(priya),
  };
  const ownerOrganizationId = owner.memberships.find(
    (membership) => membership.organizationType === "EXTERNAL_PARTNER"
  )?.organizationId;
  if (!ownerOrganizationId) throw new Error("Partner organization missing.");
  const [managing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, "CAID"))
    .limit(1);
  if (!managing) throw new Error("Managing organization missing.");

  const now = new Date();

  try {
    const assessmentChallenge = await createChallenge(
      "lifecycle-assessment",
      1,
      1,
      ownerOrganizationId,
      managing.id,
      owner.user.userId
    );
    const [assessment] = await db.insert(assessments).values({
      challengeId: assessmentChallenge.id,
      createdBy: owner.user.userId,
      scope: "INDIVIDUAL",
      status: "ACTIVE",
      title: "Disposable lifecycle assessment",
    }).returning({ id: assessments.id });
    const [section] = await db.insert(assessmentSections).values({
      assessmentId: assessment.id,
      sequence: 1,
      title: "Lifecycle verification",
    }).returning({ id: assessmentSections.id });
    await db.insert(assessmentQuestions).values({
      config: { options: ["Continue", "Stop"], correctIndex: 0 },
      prompt: "Disposable lifecycle question",
      questionType: "MULTIPLE_CHOICE",
      sectionId: section.id,
      sequence: 1,
    });

    const pending = await createApplication(
      soloInput("lifecycle-assessment", faculty.user.userId),
      actors.bao,
      { now }
    );
    let detail = await requireDetail(pending.publicId, actors.bao);
    assert(detail.status === "SUBMITTED", "new application should persist SUBMITTED");
    assert(
      deriveApplicationLifecycleView(detail).block === "SUPERVISION_PENDING",
      "pending supervision should be represented truthfully"
    );

    const requestId = await requestIdFor(pending.publicId);
    await respondToSupervisionRequest(requestId, "ACCEPT", faculty, {
      now: plusMinutes(now, 1),
    });
    detail = await requireDetail(pending.publicId, actors.bao);
    assert(
      detail.status === "ASSESSMENT",
      "accepted supervision should enter ASSESSMENT when an active assessment exists"
    );
    assert(
      deriveApplicationLifecycleView(detail).block === "ASSESSMENT_NOT_STARTED",
      "assessment-required application should not skip assessment"
    );

    await startAssessmentAttempt(pending.publicId, actors.bao, {
      now: plusMinutes(now, 2),
    });
    detail = await requireDetail(pending.publicId, actors.bao);
    assert(
      detail.status === "ASSESSMENT" &&
        deriveApplicationLifecycleView(detail).block === "ASSESSMENT_IN_PROGRESS",
      "an in-progress attempt is not a pass"
    );
    await submitAssessmentAttempt(pending.publicId, actors.bao, {
      now: plusMinutes(now, 3),
    });
    detail = await requireDetail(pending.publicId, actors.bao);
    assert(
      detail.status === "ASSESSMENT" &&
        deriveApplicationLifecycleView(detail).block === "ASSESSMENT_AWAITING_REVIEW",
      "a submitted attempt without reviewed result cannot produce a pass"
    );

    const declined = await createApplication(
      soloInput("lifecycle-assessment", faculty.user.userId),
      actors.jordan,
      { now }
    );
    await respondToSupervisionRequest(
      await requestIdFor(declined.publicId),
      "DECLINE",
      faculty,
      { now: plusMinutes(now, 1) }
    );
    const declinedDetail = await requireDetail(declined.publicId, actors.jordan);
    assert(
      declinedDetail.status === "SUBMITTED" &&
        deriveApplicationLifecycleView(declinedDetail).block ===
          "SUPERVISION_AWAITING_REROUTE",
      "declined supervision must not progress"
    );

    const expired = await createApplication(
      soloInput("lifecycle-assessment", faculty.user.userId),
      actors.priya,
      { now }
    );
    const expiredDetail = await requireDetail(expired.publicId, actors.priya);
    const respondBy = expiredDetail.supervisionRequests[0]?.respondBy;
    if (!respondBy) throw new Error("Expected supervision deadline.");
    assert(
      deriveApplicationLifecycleView(
        expiredDetail,
        false,
        new Date(respondBy.getTime() + 1)
      ).block === "SUPERVISION_AWAITING_REROUTE" &&
        expiredDetail.status === "SUBMITTED",
      "expired supervision must not progress"
    );

    const noAssessmentChallenge = await createChallenge(
      "withdrawal",
      1,
      1,
      ownerOrganizationId,
      managing.id,
      owner.user.userId
    );
    const withdrawable = await createApplication(
      soloInput("withdrawal", faculty.user.userId),
      actors.hoang,
      { now }
    );
    await respondToSupervisionRequest(
      await requestIdFor(withdrawable.publicId),
      "ACCEPT",
      faculty,
      { now: plusMinutes(now, 1) }
    );
    let withdrawableDetail = await requireDetail(withdrawable.publicId, actors.hoang);
    assert(
      withdrawableDetail.status === "SELECTION_PENDING",
      "accepted supervision without assessment should reach SELECTION_PENDING"
    );
    await withdrawApplication(withdrawable.publicId, actors.hoang, {
      now: plusMinutes(now, 2),
    });
    await withdrawApplication(withdrawable.publicId, actors.hoang, {
      now: plusMinutes(now, 3),
    });
    withdrawableDetail = await requireDetail(withdrawable.publicId, actors.hoang);
    assert(
      withdrawableDetail.status === "WITHDRAWN" &&
        deriveApplicationLifecycleView(withdrawableDetail).terminal,
      "leader withdrawal should persist terminal WITHDRAWN and retry safely"
    );
    const [withdrawnRow] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.publicId, withdrawable.publicId));
    if (!withdrawnRow) throw new Error("Withdrawn application missing.");
    assert(
      (await updateApplicationStatus(
        db,
        withdrawnRow.id,
        ["SUBMITTED"],
        "ASSESSMENT"
      )) === null,
      "stale status transition should be rejected"
    );

    const selected = await createApplication(
      soloInput("withdrawal", faculty.user.userId),
      actors.bao,
      { now }
    );
    const [selectedRow] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.publicId, selected.publicId));
    if (!selectedRow) throw new Error("Selected fixture missing.");
    await updateApplicationStatus(db, selectedRow.id, ["SUBMITTED"], "SELECTED", now);
    await expectLifecycleError(
      () => withdrawApplication(selected.publicId, actors.bao),
      "INVALID_TRANSITION"
    );

    const rejected = await createApplication(
      soloInput("withdrawal", faculty.user.userId),
      actors.jordan,
      { now }
    );
    const [rejectedRow] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.publicId, rejected.publicId));
    if (!rejectedRow) throw new Error("Rejected fixture missing.");
    await updateApplicationStatus(db, rejectedRow.id, ["SUBMITTED"], "REJECTED", now);
    await expectLifecycleError(
      () => withdrawApplication(rejected.publicId, actors.jordan),
      "INVALID_TRANSITION"
    );
    const rejectedProgress = await progressApplicationAfterGateChange(rejectedRow.id);
    assert(
      !rejectedProgress.progressed && rejectedProgress.status === "REJECTED",
      "terminal REJECTED must not reopen"
    );

    await verifyTeamAndInvitationConcurrency(
      ownerOrganizationId,
      managing.id,
      owner.user.userId,
      faculty.user.userId,
      actors,
      { bao, hoang, jordan, priya },
      now
    );
    await verifyCreateConcurrency(
      ownerOrganizationId,
      managing.id,
      owner.user.userId,
      faculty.user.userId,
      actors,
      now
    );
    await verifyRollback(
      ownerOrganizationId,
      managing.id,
      owner.user.userId,
      faculty.user.userId,
      actors.priya,
      now
    );

    void noAssessmentChallenge;
    console.log("Phase 6.6.4 application lifecycle/concurrency verification passed.");
  } finally {
    await cleanup();
  }

  const after = await counts();
  assertDeepEqual(after, baseline, "disposable lifecycle QA should restore baselines");
  console.log(JSON.stringify({ baseline: after }, null, 2));
  process.exit(0);
}

async function verifyTeamAndInvitationConcurrency(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  contactPersonId: bigint,
  facultyId: bigint,
  actors: {
    bao: ReturnType<typeof toApplicationActorContext>;
    hoang: ReturnType<typeof toApplicationActorContext>;
    jordan: ReturnType<typeof toApplicationActorContext>;
    priya: ReturnType<typeof toApplicationActorContext>;
  },
  authenticated: {
    bao: Awaited<ReturnType<typeof getAuthenticatedActorForVerification>>;
    hoang: Awaited<ReturnType<typeof getAuthenticatedActorForVerification>>;
    jordan: Awaited<ReturnType<typeof getAuthenticatedActorForVerification>>;
    priya: Awaited<ReturnType<typeof getAuthenticatedActorForVerification>>;
  },
  now: Date
) {
  await createChallenge(
    "team",
    1,
    2,
    ownerOrganizationId,
    managingOrganizationId,
    contactPersonId
  );
  const invited = await createApplication(
    {
      ...soloInput("team", facultyId),
      members: [{ status: "INVITED", studentEmail: actors.hoang.email }],
      teamName: "Invitation semantics",
    },
    actors.jordan,
    { now }
  );
  const competing = await createApplication(
    soloInput("team", facultyId),
    actors.hoang,
    { now }
  );
  assert(Boolean(competing), "an invitation must not count as accepted participation");
  await expectInvitationError(
    () => respondToInvitation(invited.publicId, "ACCEPT", authenticated.hoang),
    "CONFLICT"
  );
  await respondToInvitation(invited.publicId, "DECLINE", authenticated.hoang);

  const team = await createApplication(
    {
      ...soloInput("team", facultyId),
      members: [{ status: "ACCEPTED", studentEmail: actors.priya.email }],
      teamName: "Accepted team",
    },
    actors.bao,
    { now }
  );
  await expectLifecycleError(
    () => withdrawApplication(team.publicId, actors.priya),
    "FORBIDDEN"
  );
  await withdrawApplication(team.publicId, actors.bao);
  const teamMembers = await db
    .select({
      memberRole: applicationMembers.memberRole,
      status: applicationMembers.status,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .innerJoin(applications, eq(applications.id, applicationMembers.applicationId))
    .where(eq(applications.publicId, team.publicId));
  assert(teamMembers.length === 2, "team should retain both accepted members");
  assert(
    teamMembers.filter(
      (member) => member.memberRole === "LEADER" && member.status === "ACCEPTED"
    ).length === 1,
    "team should have exactly one accepted leader"
  );
  assert(
    new Set(teamMembers.map((member) => member.studentId.toString())).size ===
      teamMembers.length,
    "team should contain no duplicate member row"
  );
}

async function verifyCreateConcurrency(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  contactPersonId: bigint,
  facultyId: bigint,
  actors: {
    bao: ReturnType<typeof toApplicationActorContext>;
    hoang: ReturnType<typeof toApplicationActorContext>;
    jordan: ReturnType<typeof toApplicationActorContext>;
    priya: ReturnType<typeof toApplicationActorContext>;
  },
  now: Date
) {
  const rapid = await createChallenge(
    "rapid",
    1,
    1,
    ownerOrganizationId,
    managingOrganizationId,
    contactPersonId
  );
  const rapidResults = await Promise.allSettled([
    createApplication(soloInput("rapid", facultyId), actors.bao, { now }),
    createApplication(soloInput("rapid", facultyId), actors.bao, { now }),
  ]);
  assertOneCreateOneConflict(rapidResults, "rapid double-submit");
  assert((await applicationCount(rapid.id)) === 1, "rapid submit should create one application");
  assert((await supervisionCount(rapid.id)) === 1, "rapid submit should create one supervision request");
  await expectApplicationError(
    () => createApplication(soloInput("rapid", facultyId), actors.bao, { now }),
    "CONFLICT"
  );

  const tabs = await createChallenge(
    "tabs",
    1,
    1,
    ownerOrganizationId,
    managingOrganizationId,
    contactPersonId
  );
  const tabResults = await Promise.allSettled([
    createApplication(soloInput("tabs", facultyId), actors.jordan, { now }),
    createApplication(soloInput("tabs", facultyId), actors.jordan, { now }),
  ]);
  assertOneCreateOneConflict(tabResults, "two-tab submit");
  assert((await applicationCount(tabs.id)) === 1, "two tabs should create one application");

  const overlapping = await createChallenge(
    "overlap",
    2,
    2,
    ownerOrganizationId,
    managingOrganizationId,
    contactPersonId
  );
  const conflictResults = await Promise.allSettled([
    createApplication(
      {
        ...soloInput("overlap", facultyId),
        members: [{ status: "ACCEPTED", studentEmail: actors.hoang.email }],
        teamName: "Overlap A",
      },
      actors.bao,
      { now }
    ),
    createApplication(
      {
        ...soloInput("overlap", facultyId),
        members: [{ status: "ACCEPTED", studentEmail: actors.hoang.email }],
        teamName: "Overlap B",
      },
      actors.priya,
      { now }
    ),
  ]);
  assertOneCreateOneConflict(conflictResults, "overlapping team transactions");
  assert(
    (await applicationCount(overlapping.id)) === 1,
    "overlapping accepted participant should belong to one active application"
  );
}

async function verifyRollback(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  contactPersonId: bigint,
  facultyId: bigint,
  actor: ReturnType<typeof toApplicationActorContext>,
  now: Date
) {
  const challenge = await createChallenge(
    "rollback",
    1,
    1,
    ownerOrganizationId,
    managingOrganizationId,
    contactPersonId
  );
  try {
    await db.transaction(async (tx) => {
      await createApplication(soloInput("rollback", facultyId), actor, {
        database: tx,
        now,
      });
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
  assert((await applicationCount(challenge.id)) === 0, "rollback should remove application");
  assert((await supervisionCount(challenge.id)) === 0, "rollback should remove supervision request");
}

async function createChallenge(
  suffix: string,
  teamSizeMin: number,
  teamSizeMax: number,
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  contactPersonId: bigint
) {
  const [challenge] = await db
    .insert(challenges)
    .values({
      applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
      contactPersonId,
      description: "Disposable Phase 6.6.4 lifecycle verification challenge.",
      managingOrganizationId,
      ownerOrganizationId,
      slug: `${PREFIX}${suffix}`,
      status: "APPLICATIONS_OPEN",
      summary: "Disposable lifecycle verification.",
      teamSizeMax,
      teamSizeMin,
      title: `QA 664 ${suffix}`,
      visibility: "VINUNI_ONLY",
      weeklyHours: 8,
    })
    .returning({ id: challenges.id });
  if (!challenge) throw new Error("Disposable challenge creation failed.");
  return challenge;
}

function soloInput(suffix: string, facultySupervisorId: bigint) {
  return {
    challengeSlug: `${PREFIX}${suffix}`,
    facultySupervisorId,
    leaderCommittedHoursPerWeek: 8,
    motivation: "Disposable Phase 6.6.4 lifecycle verification.",
    teamName: null,
  };
}

async function requireDetail(
  publicId: string,
  actor: ReturnType<typeof toApplicationActorContext>
) {
  const detail = await getApplicationDetail(publicId, actor);
  if (!detail) throw new Error("Application detail missing.");
  return detail;
}

async function requestIdFor(publicId: string) {
  const [request] = await db
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.publicId, publicId))
    .limit(1);
  if (!request) throw new Error("Supervision request missing.");
  return request.id;
}

async function applicationCount(challengeId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(applications)
    .where(eq(applications.challengeId, challengeId));
  return Number(row?.total ?? 0);
}

async function supervisionCount(challengeId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.challengeId, challengeId));
  return Number(row?.total ?? 0);
}

async function counts() {
  const [applicationRows, memberRows, requestRows, challengeRows, assessmentRows] =
    await Promise.all([
      db.select({ total: count() }).from(applications),
      db.select({ total: count() }).from(applicationMembers),
      db.select({ total: count() }).from(supervisionRequests),
      db.select({ total: count() }).from(challenges),
      db.select({ total: count() }).from(assessments),
    ]);
  return {
    applications: Number(applicationRows[0]?.total ?? 0),
    applicationMembers: Number(memberRows[0]?.total ?? 0),
    assessments: Number(assessmentRows[0]?.total ?? 0),
    challenges: Number(challengeRows[0]?.total ?? 0),
    supervisionRequests: Number(requestRows[0]?.total ?? 0),
  };
}

async function cleanup() {
  const slugs = [
    `${PREFIX}lifecycle-assessment`,
    `${PREFIX}withdrawal`,
    `${PREFIX}team`,
    `${PREFIX}rapid`,
    `${PREFIX}tabs`,
    `${PREFIX}overlap`,
    `${PREFIX}rollback`,
  ];
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: challenges.id })
      .from(challenges)
      .where(inArray(challenges.slug, slugs));
    const challengeIds = rows.map((row) => row.id);
    if (challengeIds.length === 0) return;
    await tx
      .delete(applications)
      .where(inArray(applications.challengeId, challengeIds));
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

function assertOneCreateOneConflict(
  results: PromiseSettledResult<unknown>[],
  label: string
) {
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  assert(fulfilled.length === 1 && rejected.length === 1, `${label} should converge to one create`);
  const reason = rejected[0] && rejected[0].status === "rejected" ? rejected[0].reason : null;
  assert(
    reason instanceof ApplicationError && reason.code === "CONFLICT",
    `${label} loser should receive controlled conflict`
  );
}

async function expectApplicationError(
  operation: () => Promise<unknown>,
  code: ApplicationError["code"]
) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof ApplicationError && error.code === code) return;
    throw error;
  }
  throw new Error(`Expected ApplicationError ${code}.`);
}

async function expectLifecycleError(
  operation: () => Promise<unknown>,
  code: ApplicationLifecycleError["code"]
) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof ApplicationLifecycleError && error.code === code) return;
    throw error;
  }
  throw new Error(`Expected ApplicationLifecycleError ${code}.`);
}

async function expectInvitationError(
  operation: () => Promise<unknown>,
  code: InvitationError["code"]
) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof InvitationError && error.code === code) return;
    throw error;
  }
  throw new Error(`Expected InvitationError ${code}.`);
}

function plusMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify({ actual, expected })}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
