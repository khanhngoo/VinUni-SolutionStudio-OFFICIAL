import "dotenv/config";

import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  agreements,
  applicationMembers,
  applications,
  challenges,
  deliverables,
  feedback,
  milestoneReviews,
  milestoneSubmissions,
  milestones,
  offers,
  organizations,
  projectFinalReviews,
  projectMembers,
  projectResources,
  projects,
  selections,
  supervisionRequests,
} from "@/db/schema";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { createApplication, toApplicationActorContext } from "@/services/application.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import { issueSelectionOffer, respondToOffer } from "@/services/offer.service";
import {
  MilestoneReviewError,
  createProjectMilestone,
  recordFacultyMilestoneReview,
  recordFinalProjectReview,
  recordPartnerMilestoneReview,
  submitMilestoneWork,
  submitPartnerCloseoutFeedback,
  type MilestoneSubmissionInput,
} from "@/services/milestone-review.service";
import { WorkspaceError, getWorkspaceDetail } from "@/services/workspace.service";
import { getCurrentSubmission } from "@/db/mutations/milestones";
import { getAuthenticatedActorForVerification } from "./_actor";

const SLUG = "qa-668-closeout";

type A = AuthenticatedActor;
interface Cast {
  bao: A; caid: A; diane: A; hoang: A; jordan: A; owner: A; pham: A; priya: A; vhf: A;
}

async function main() {
  await cleanup();
  const baseline = await counts();
  const emails: Record<keyof Cast, string> = {
    bao: "student.bao-tran.demo@example.test",
    caid: "caid.admin.dev@example.test",
    diane: "faculty.diane-osei.demo@example.test",
    hoang: "student.hoang-tran.demo@example.test",
    jordan: "student.jordan-lee.demo@example.test",
    owner: "contact.bencang.demo@example.test",
    pham: "faculty.minh-pham.demo@example.test",
    priya: "student.priya-raman.demo@example.test",
    vhf: "contact.vhf.demo@example.test",
  };
  const cast = Object.fromEntries(
    await Promise.all(Object.entries(emails).map(async ([key, email]) => [key, await getAuthenticatedActorForVerification(email)]))
  ) as Cast;

  try {
    const { applicationPublicId, projectId } = await provisionRuntimeProject(cast);
    await verifyPlanningAndFeedbackGates(applicationPublicId, cast);
    const m1 = await milestone(applicationPublicId, cast.diane, "QA 668 Discovery");
    const m3 = await milestone(applicationPublicId, cast.owner, "QA 668 Prototype");
    const m2 = await milestone(applicationPublicId, cast.diane, "QA 668 Handover");
    await verifySubmissionAuthority(m1, cast);
    await verifySequentialReviewRounds(m1, projectId, cast);
    await verifyConcurrencyAndStaleRounds(m3, projectId, cast);
    await verifyApprovalRevisionRaceAndFinalMilestone(m2, projectId, cast);
    await verifyFinalReview(applicationPublicId, projectId, cast);
    await verifyTerminalProtection(applicationPublicId, m1, cast);
    await verifyResourceGating(applicationPublicId, projectId, cast);
    await verifyIntegrity(projectId);
  } finally {
    await cleanup();
  }

  assertEquals(await counts(), baseline, "canonical counts must return to baseline");
  console.log("Phase 6.6.8 milestone / final-review verification passed.");
  console.log(JSON.stringify(baseline, null, 2));
}

// ---------------------------------------------------------------------------
// Setup: a genuine Phase 6.6.7 runtime project with no milestones
// ---------------------------------------------------------------------------

async function provisionRuntimeProject(cast: Cast) {
  const ownerOrg = cast.owner.memberships.find((m) => m.organizationType === "EXTERNAL_PARTNER")!.organizationId;
  const [caid] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, "CAID")).limit(1);
  await db.insert(challenges).values({
    applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
    contactPersonId: cast.owner.user.userId,
    description: "Disposable Phase 6.6.8 close-out verification.",
    managingOrganizationId: caid.id,
    ownerOrganizationId: ownerOrg,
    slug: SLUG,
    status: "APPLICATIONS_OPEN",
    summary: "Disposable Phase 6.6.8 close-out verification.",
    teamSizeMax: 2,
    teamSizeMin: 2,
    title: "QA 668 close-out",
    visibility: "VINUNI_ONLY",
    weeklyHours: 10,
  });
  const created = await createApplication(
    {
      challengeSlug: SLUG,
      facultySupervisorId: cast.diane.user.userId,
      leaderCommittedHoursPerWeek: 10,
      members: [{ status: "ACCEPTED", studentEmail: cast.bao.user.email }],
      motivation: "Disposable Phase 6.6.8 close-out verification.",
      teamName: "QA 668 Team",
    },
    toApplicationActorContext(cast.priya)
  );
  const [request] = await db
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.publicId, created.publicId));
  await respondToSupervisionRequest(request.id, "ACCEPT", cast.diane);
  await issueSelectionOffer(
    created.publicId,
    { compensationNote: "QA 668", durationWeeks: 8, hoursPerWeek: 10, ndaRequired: false, respondByWorkingDays: 5, startDate: "2026-10-26" },
    cast.owner
  );
  await respondToOffer(created.publicId, "ACCEPT", toApplicationActorContext(cast.priya));
  const [project] = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .where(eq(applications.publicId, created.publicId));
  assert(project?.status === "ACTIVE", "6.6.7 acceptance must provision an ACTIVE project");
  assertCount(await rows(milestones, eq(milestones.projectId, project.id)), 0, "a runtime project starts with no milestones");

  // An invited application member who never joined the project.
  const [app] = await db.select({ id: applications.id }).from(applications).where(eq(applications.publicId, created.publicId));
  await db.insert(applicationMembers).values({ applicationId: app.id, memberRole: "MEMBER", status: "INVITED", studentId: cast.hoang.user.userId });
  return { applicationPublicId: created.publicId, projectId: project.id };
}

async function milestone(applicationPublicId: string, actor: A, title: string) {
  const row = await createProjectMilestone(applicationPublicId, { deadline: "2026-11-15", description: `${title} deliverable`, title }, actor);
  return row.id;
}

// ---------------------------------------------------------------------------
// Milestone creation authority + feedback timing
// ---------------------------------------------------------------------------

async function verifyPlanningAndFeedbackGates(applicationPublicId: string, cast: Cast) {
  for (const [label, actor] of [
    ["project member", cast.bao],
    ["unrelated faculty", cast.pham],
    ["unrelated partner", cast.vhf],
    ["managing-unit admin (no owner authority)", cast.caid],
  ] as const) {
    await expectCode("NOT_FOUND", () => createProjectMilestone(applicationPublicId, { deadline: null, description: null, title: "x" }, actor), `${label} creates milestone`);
  }
  await expectCode("VALIDATION_ERROR", () => createProjectMilestone(applicationPublicId, { deadline: "not-a-date", description: null, title: "Bad" }, cast.diane), "invalid deadline");
  await expectCode("INVALID_TRANSITION", () => submitPartnerCloseoutFeedback(applicationPublicId, closeout(), cast.owner), "close-out feedback while ACTIVE");
}

// ---------------------------------------------------------------------------
// A. Submission authority, validation, rollback
// ---------------------------------------------------------------------------

async function verifySubmissionAuthority(m1: bigint, cast: Cast) {
  for (const [label, actor] of [
    ["unrelated student", cast.jordan],
    ["invited non-project application member", cast.hoang],
    ["supervisor", cast.diane],
    ["owner partner", cast.owner],
  ] as const) {
    await expectCode("NOT_FOUND", () => submitMilestoneWork(m1, link("x"), actor), `${label} submits`);
  }
  // Cross-project: a project member of this project on another project's milestone.
  const [foreign] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .innerJoin(projects, eq(projects.id, milestones.projectId))
    .where(sql`not exists (select 1 from project_members pm where pm.project_id = ${projects.id} and pm.student_id = ${cast.bao.user.userId})`)
    .limit(1);
  await expectCode("NOT_FOUND", () => submitMilestoneWork(foreign.id, link("x"), cast.bao), "cross-project submission");
  await expectCode("NOT_FOUND", () => submitMilestoneWork(BigInt(999_999_999), link("x"), cast.bao), "nonexistent milestone");
  await expectCode("VALIDATION_ERROR", () => submitMilestoneWork(m1, { ...link("x"), url: "http://insecure.example" }, cast.bao), "non-https link");
  await expectCode("VALIDATION_ERROR", () => submitMilestoneWork(m1, { ...link(""), title: "" }, cast.bao), "missing title");
  await expectCode("VALIDATION_ERROR", () => submitMilestoneWork(m1, { deliverableType: "TEXT", description: "", title: "Notes", url: null }, cast.bao), "empty written update");

  await expectThrown("injected submission failure", () =>
    submitMilestoneWork(m1, link("Rolled back"), cast.bao, { injectFailureAfterSubmissionInsert: () => { throw new Error("injected submission failure"); } })
  );
  assertCount(await rows(milestoneSubmissions, eq(milestoneSubmissions.milestoneId, m1)), 0, "failed submission leaves no round");
  assertCount(await rows(deliverables, eq(deliverables.milestoneId, m1)), 0, "failed submission leaves no deliverable");
  await assertMilestone(m1, "PENDING");
}

// ---------------------------------------------------------------------------
// B. Authority, dual approval, revision, new round, history
// ---------------------------------------------------------------------------

async function verifySequentialReviewRounds(m1: bigint, projectId: bigint, cast: Cast) {
  const r1 = await submitMilestoneWork(m1, link("Discovery report"), cast.bao);
  assert(r1.roundNumber === 1, "first submission is round 1");
  await assertMilestone(m1, "SUBMITTED");
  await expectCode("CONFLICT", () => submitMilestoneWork(m1, link("again"), cast.priya), "resubmit while awaiting review");

  await expectCode("NOT_FOUND", () => recordFacultyMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.pham), "unrelated faculty review");
  await expectCode("NOT_FOUND", () => recordPartnerMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.vhf), "unrelated partner review");
  await expectCode("NOT_FOUND", () => recordPartnerMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.caid), "managing admin as partner");
  await expectCode("NOT_FOUND", () => recordPartnerMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.bao), "student as partner");
  await expectCode("FORBIDDEN", () => recordFacultyMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.bao), "student as faculty");
  await expectCode("VALIDATION_ERROR", () => recordPartnerMilestoneReview(m1, r1.submissionId, "REVISION_REQUESTED", "  ", cast.owner), "revision without reason");

  await recordFacultyMilestoneReview(m1, r1.submissionId, "APPROVED", "Looks right.", cast.diane);
  await assertMilestone(m1, "SUBMITTED");
  await recordPartnerMilestoneReview(m1, r1.submissionId, "REVISION_REQUESTED", "Add the raw counts.", cast.owner);
  await assertMilestone(m1, "REVISION_REQUESTED");
  await expectCode("INVALID_TRANSITION", () => recordPartnerMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.owner), "review after the round closed");

  const r2 = await submitMilestoneWork(m1, { deliverableType: "TEXT", description: "Raw counts added.", title: "Discovery report v2", url: null }, cast.priya);
  assert(r2.roundNumber === 2, "resubmission opens round 2");
  await expectCode("CONFLICT", () => recordFacultyMilestoneReview(m1, r1.submissionId, "APPROVED", null, cast.diane), "stale round-1 faculty review");

  // Faculty approved round 1; that must not count toward round 2.
  await recordPartnerMilestoneReview(m1, r2.submissionId, "APPROVED", null, cast.owner);
  await assertMilestone(m1, "SUBMITTED");
  await recordFacultyMilestoneReview(m1, r2.submissionId, "APPROVED", null, cast.diane);
  await assertMilestone(m1, "COMPLETED");
  await assertProject(projectId, "ACTIVE");
  await expectCode("INVALID_TRANSITION", () => submitMilestoneWork(m1, link("late"), cast.bao), "resubmit a completed milestone");

  const detail = await getWorkspaceDetail((await publicIdFor(projectId))!, toApplicationActorContext(cast.bao));
  const history = detail!.milestones.find((item) => item.id === m1.toString())!.reviewHistory;
  assertEquals(
    history.map((item) => `${item.roundNumber}:${item.reviewerRole}:${item.decision}`).sort(),
    ["1:FACULTY:APPROVED", "1:PARTNER:REVISION_REQUESTED", "2:FACULTY:APPROVED", "2:PARTNER:APPROVED"],
    "every review event across rounds remains readable"
  );
}

// ---------------------------------------------------------------------------
// C. Concurrency, duplicates, injected failure, stale rounds
// ---------------------------------------------------------------------------

async function verifyConcurrencyAndStaleRounds(m3: bigint, projectId: bigint, cast: Cast) {
  const submits = await Promise.allSettled([
    submitMilestoneWork(m3, link("Prototype A"), cast.bao),
    submitMilestoneWork(m3, link("Prototype B"), cast.priya),
  ]);
  assertOneOkOneCode(submits, "CONFLICT", "simultaneous submissions");
  assertCount(await rows(milestoneSubmissions, eq(milestoneSubmissions.milestoneId, m3)), 1, "simultaneous submissions create one round");
  const r1 = (await getCurrentSubmission(db, m3))!;

  const duplicates = await Promise.allSettled([
    recordPartnerMilestoneReview(m3, r1.id, "APPROVED", null, cast.owner),
    recordPartnerMilestoneReview(m3, r1.id, "APPROVED", null, cast.owner),
  ]);
  assertOneOkOneCode(duplicates, "CONFLICT", "duplicate same-role review");
  assertCount(await rows(milestoneReviews, and(eq(milestoneReviews.submissionId, r1.id), eq(milestoneReviews.reviewerRole, "PARTNER"))), 1, "one partner decision per round");

  await expectThrown("injected review failure", () =>
    recordFacultyMilestoneReview(m3, r1.id, "APPROVED", null, cast.diane, { injectFailureAfterReviewInsert: () => { throw new Error("injected review failure"); } })
  );
  assertCount(await rows(milestoneReviews, and(eq(milestoneReviews.submissionId, r1.id), eq(milestoneReviews.reviewerRole, "FACULTY"))), 0, "failed review insert rolls back");
  await assertMilestone(m3, "SUBMITTED");

  await recordFacultyMilestoneReview(m3, r1.id, "REVISION_REQUESTED", "Needs error handling.", cast.diane);
  const r2 = await submitMilestoneWork(m3, link("Prototype v2"), cast.bao);
  await expectCode("CONFLICT", () => recordPartnerMilestoneReview(m3, r1.id, "APPROVED", null, cast.owner), "stale round-1 partner review after resubmission");
  await recordFacultyMilestoneReview(m3, r2.submissionId, "APPROVED", null, cast.diane);
  await assertMilestone(m3, "SUBMITTED");
  await recordPartnerMilestoneReview(m3, r2.submissionId, "APPROVED", null, cast.owner);
  await assertMilestone(m3, "COMPLETED");
  await assertProject(projectId, "ACTIVE");
}

async function verifyApprovalRevisionRaceAndFinalMilestone(m2: bigint, projectId: bigint, cast: Cast) {
  const r1 = await submitMilestoneWork(m2, link("Handover deck"), cast.priya);
  const race = await Promise.allSettled([
    recordFacultyMilestoneReview(m2, r1.submissionId, "APPROVED", null, cast.diane),
    recordPartnerMilestoneReview(m2, r1.submissionId, "REVISION_REQUESTED", "Add the rollout plan.", cast.owner),
  ]);
  const revision = race[1];
  assert(revision.status === "fulfilled", "the revision request always lands");
  await assertMilestone(m2, "REVISION_REQUESTED");
  if (race[0].status === "rejected") {
    assert(race[0].reason instanceof MilestoneReviewError && race[0].reason.code === "INVALID_TRANSITION", "a losing approval is a controlled refusal");
  }

  const r2 = await submitMilestoneWork(m2, link("Handover deck v2"), cast.bao);
  const both = await Promise.allSettled([
    recordFacultyMilestoneReview(m2, r2.submissionId, "APPROVED", null, cast.diane),
    recordPartnerMilestoneReview(m2, r2.submissionId, "APPROVED", null, cast.owner),
  ]);
  assert(both.every((item) => item.status === "fulfilled"), "concurrent faculty + partner approvals both land");
  await assertMilestone(m2, "COMPLETED");
  assertCount(await rows(milestoneReviews, eq(milestoneReviews.submissionId, r2.submissionId)), 2, "exactly one decision per side in the completing round");
  await assertProject(projectId, "FINAL_REVIEW");
}

// ---------------------------------------------------------------------------
// D. Final review, revision back to ACTIVE, rounds, feedback
// ---------------------------------------------------------------------------

async function verifyFinalReview(applicationPublicId: string, projectId: bigint, cast: Cast) {
  await expectCode("INVALID_TRANSITION", () => createProjectMilestone(applicationPublicId, { deadline: null, description: null, title: "Late" }, cast.diane), "add milestone in FINAL_REVIEW");
  await expectCode("NOT_FOUND", () => recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", null, cast.pham), "unrelated faculty final review");
  await expectCode("NOT_FOUND", () => recordFinalProjectReview(applicationPublicId, "PARTNER", "APPROVED", null, cast.vhf), "unrelated partner final review");
  await expectCode("NOT_FOUND", () => recordFinalProjectReview(applicationPublicId, "PARTNER", "APPROVED", null, cast.bao), "student final review");

  await recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", null, cast.diane);
  await assertProject(projectId, "FINAL_REVIEW");
  await recordFinalProjectReview(applicationPublicId, "PARTNER", "REVISION_REQUESTED", "Add a maintenance note.", cast.owner);
  await assertProject(projectId, "ACTIVE");

  const m4 = await milestone(applicationPublicId, cast.owner, "QA 668 Maintenance note");
  const r = await submitMilestoneWork(m4, link("Maintenance note"), cast.priya);
  await recordFacultyMilestoneReview(m4, r.submissionId, "APPROVED", null, cast.diane);
  await recordPartnerMilestoneReview(m4, r.submissionId, "APPROVED", null, cast.owner);
  await assertProject(projectId, "FINAL_REVIEW");

  await expectCode("CONFLICT", () => recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", null, cast.diane, { expectedRound: 1 }), "stale final-review round");

  // Close-out feedback: optional, during FINAL_REVIEW, separate from approval.
  await expectCode("NOT_FOUND", () => submitPartnerCloseoutFeedback(applicationPublicId, closeout(), cast.vhf), "unrelated partner feedback");
  await submitPartnerCloseoutFeedback(applicationPublicId, closeout(), cast.owner);
  await expectCode("CONFLICT", () => submitPartnerCloseoutFeedback(applicationPublicId, closeout(), cast.owner), "second close-out feedback");
  assertCount(await rows(feedback, eq(feedback.projectId, projectId)), 2, "team note + private note");
  const seen = (await getWorkspaceDetail(applicationPublicId, toApplicationActorContext(cast.bao)))!.closeoutFeedback;
  assert(seen.length === 1 && seen[0].content === "Delivered what we asked for." && !JSON.stringify(seen).includes("private"), "team sees the shared note only");
  await assertProject(projectId, "FINAL_REVIEW");

  // Round 2: the faculty's round-1 approval does not carry over.
  await recordFinalProjectReview(applicationPublicId, "PARTNER", "APPROVED", null, cast.owner, { expectedRound: 2 });
  await assertProject(projectId, "FINAL_REVIEW");
  await expectThrown("injected final failure", () =>
    recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", null, cast.diane, { injectFailureAfterReviewInsert: () => { throw new Error("injected final failure"); } })
  );
  assertCount(await rows(projectFinalReviews, and(eq(projectFinalReviews.projectId, projectId), eq(projectFinalReviews.roundNumber, 2), eq(projectFinalReviews.reviewerRole, "FACULTY"))), 0, "failed final review rolls back");
  await assertProject(projectId, "FINAL_REVIEW");

  const finals = await Promise.allSettled([
    recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", "Well done.", cast.diane, { expectedRound: 2 }),
    recordFinalProjectReview(applicationPublicId, "FACULTY", "APPROVED", "Well done.", cast.diane, { expectedRound: 2 }),
  ]);
  // The loser waits on the project lock and then sees COMPLETED.
  assertOneOkOneCode(finals, "INVALID_TRANSITION", "duplicate concurrent final approvals");
  await assertProject(projectId, "COMPLETED");
  const [row] = await db.select({ endDate: projects.endDate, startDate: projects.startDate }).from(projects).where(eq(projects.id, projectId));
  assert(row.endDate === null, "a project closed before its recorded start date keeps no end date");
  assertCount(await rows(projectFinalReviews, eq(projectFinalReviews.projectId, projectId)), 4, "final-review history: 2 in round 1, 2 in round 2");
}

// ---------------------------------------------------------------------------
// COMPLETED: readable, writes refused
// ---------------------------------------------------------------------------

async function verifyTerminalProtection(applicationPublicId: string, m1: bigint, cast: Cast) {
  for (const [label, actor] of [["member", cast.bao], ["supervisor", cast.diane], ["owner partner", cast.owner]] as const) {
    const detail = await getWorkspaceDetail(applicationPublicId, toApplicationActorContext(actor));
    assert(detail?.projectStatus === "COMPLETED", `${label} can still read the completed workspace`);
  }
  await expectWorkspaceForbidden(() => getWorkspaceDetail(applicationPublicId, toApplicationActorContext(cast.jordan)), "unrelated student");
  await expectWorkspaceForbidden(() => getWorkspaceDetail(applicationPublicId, toApplicationActorContext(cast.vhf)), "unrelated partner");
  await expectWorkspaceForbidden(() => getWorkspaceDetail(applicationPublicId, toApplicationActorContext(cast.hoang)), "invited non-member");

  const current = (await getCurrentSubmission(db, m1))!;
  await expectCode("INVALID_TRANSITION", () => submitMilestoneWork(m1, link("post"), cast.bao), "submit after completion");
  await expectCode("INVALID_TRANSITION", () => createProjectMilestone(applicationPublicId, { deadline: null, description: null, title: "post" }, cast.diane), "add milestone after completion");
  await expectCode("INVALID_TRANSITION", () => recordFacultyMilestoneReview(m1, current.id, "APPROVED", null, cast.diane), "milestone review after completion");
  await expectCode("INVALID_TRANSITION", () => recordFinalProjectReview(applicationPublicId, "PARTNER", "APPROVED", null, cast.owner), "final review after completion");
  await expectCode("INVALID_TRANSITION", () => submitPartnerCloseoutFeedback(applicationPublicId, closeout(), cast.owner), "feedback after completion");
}

// ---------------------------------------------------------------------------
// E. Agreement-gated resources and cross-project isolation
// ---------------------------------------------------------------------------

async function verifyResourceGating(applicationPublicId: string, projectId: bigint, cast: Cast) {
  const [app] = await db.select({ id: applications.id, challengeId: applications.challengeId }).from(applications).where(eq(applications.publicId, applicationPublicId));
  assertCount(await rows(agreements, eq(agreements.applicationId, app.id)), 0, "no agreement was created automatically at any stage");
  await db.insert(projectResources).values({ projectId, requiresAgreement: true, sensitivityLevel: "RESTRICTED", title: "QA 668 restricted dataset" });
  await db.insert(agreements).values({ acceptedAt: new Date(), agreementType: "NDA", agreementVersion: "v1", applicationId: app.id, challengeId: app.challengeId, userId: cast.priya.user.userId });

  const access = async (actor: A) =>
    (await getWorkspaceDetail(applicationPublicId, toApplicationActorContext(actor)))!.resources.find((r) => r.title === "QA 668 restricted dataset")!.access;
  assert((await access(cast.priya)) === "AVAILABLE", "member with an accepted NDA can read the restricted resource");
  assert((await access(cast.bao)) === "AGREEMENT_REQUIRED", "member without an NDA cannot");
  assert((await access(cast.diane)) === "AVAILABLE", "supervisor keeps the existing non-student policy");
  assert((await access(cast.owner)) === "AVAILABLE", "owner partner keeps the existing non-student policy");

  // A member of a seeded project must not see this project's resources at all.
  await expectWorkspaceForbidden(() => getWorkspaceDetail(applicationPublicId, toApplicationActorContext(cast.jordan)), "cross-project member");
}

// ---------------------------------------------------------------------------
// G. FK / ownership integrity
// ---------------------------------------------------------------------------

async function verifyIntegrity(projectId: bigint) {
  const mismatched = await db.execute(sql`
    select 'deliverable' as kind, d.id from deliverables d join milestone_submissions s on s.id = d.submission_id where s.milestone_id <> d.milestone_id
    union all
    select 'review', r.id from milestone_reviews r join milestone_submissions s on s.id = r.submission_id where s.milestone_id <> r.milestone_id
  `);
  assert(mismatched.rows.length === 0, "every deliverable and review belongs to a round of its own milestone");
  const gaps = await db.execute(sql`
    select m.id from milestones m join milestone_submissions s on s.milestone_id = m.id
    where m.project_id = ${projectId}
    group by m.id having max(s.round_number) <> count(*)
  `);
  assert(gaps.rows.length === 0, "rounds are contiguous 1..n");
  const orphans = await db.execute(sql`
    select pm.id from project_members pm join projects p on p.id = pm.project_id
    left join application_members am on am.application_id = p.application_id and am.student_id = pm.student_id and am.status = 'ACCEPTED'
    where p.id = ${projectId} and am.id is null
  `);
  assert(orphans.rows.length === 0, "project members are exactly accepted application members");
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function link(title: string): MilestoneSubmissionInput {
  return { deliverableType: "LINK", description: "Disposable Phase 6.6.8 deliverable.", title, url: "https://example.org/qa-668" };
}

function closeout() {
  return { hostAgain: "Yes", note: "Delivered what we asked for.", privateNote: "private — admin eyes only", quality: "Strong", reliability: "Proficient" };
}

async function publicIdFor(projectId: bigint) {
  const [row] = await db.select({ publicId: applications.publicId }).from(projects).innerJoin(applications, eq(applications.id, projects.applicationId)).where(eq(projects.id, projectId));
  return row?.publicId ?? null;
}

async function rows(table: PgTable, where: SQL | undefined) {
  const [row] = await db.select({ total: count() }).from(table).where(where);
  return Number(row?.total ?? 0);
}

async function assertMilestone(id: bigint, expected: string) {
  const [row] = await db.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, id));
  assert(row?.status === expected, `milestone ${id} expected ${expected}, got ${row?.status}`);
}

async function assertProject(id: bigint, expected: string) {
  const [row] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, id));
  assert(row?.status === expected, `project expected ${expected}, got ${row?.status}`);
}

async function counts() {
  const tables = { agreements, applicationMembers, applications, challenges, deliverables, feedback, milestoneReviews, milestoneSubmissions, milestones, offers, projectFinalReviews, projectMembers, projectResources, projects, selections, supervisionRequests };
  const entries = await Promise.all(Object.entries(tables).map(async ([name, table]) => {
    const [row] = await db.select({ total: count() }).from(table);
    return [name, Number(row?.total ?? 0)] as const;
  }));
  return Object.fromEntries(entries);
}

async function cleanup() {
  await db.transaction(async (tx) => {
    const challengeIds = (await tx.select({ id: challenges.id }).from(challenges).where(eq(challenges.slug, SLUG))).map((r) => r.id);
    if (challengeIds.length === 0) return;
    const applicationIds = (await tx.select({ id: applications.id }).from(applications).where(inArray(applications.challengeId, challengeIds))).map((r) => r.id);
    if (applicationIds.length > 0) {
      await tx.delete(projects).where(inArray(projects.applicationId, applicationIds));
      const selectionIds = (await tx.select({ id: selections.id }).from(selections).where(inArray(selections.applicationId, applicationIds))).map((r) => r.id);
      if (selectionIds.length > 0) {
        await tx.delete(offers).where(inArray(offers.selectionId, selectionIds));
        await tx.delete(selections).where(inArray(selections.id, selectionIds));
      }
      await tx.delete(agreements).where(inArray(agreements.applicationId, applicationIds));
      await tx.delete(applications).where(inArray(applications.id, applicationIds));
    }
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

async function expectCode(code: MilestoneReviewError["code"], action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof MilestoneReviewError && error.code === code) return;
    throw new Error(`${label}: expected ${code}, got ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
  }
  throw new Error(`${label}: expected ${code}, but it succeeded.`);
}

async function expectThrown(message: string, action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error && error.message === message) return;
    throw error;
  }
  throw new Error(`Expected "${message}".`);
}

async function expectWorkspaceForbidden(action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof WorkspaceError && error.code === "FORBIDDEN") return;
    throw error;
  }
  throw new Error(`${label}: expected workspace FORBIDDEN.`);
}

function assertOneOkOneCode(results: PromiseSettledResult<unknown>[], code: string, label: string) {
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  assert(ok.length === 1 && failed.length === 1, `${label}: expected one success and one refusal`);
  assert(failed[0].reason instanceof MilestoneReviewError && failed[0].reason.code === code, `${label}: refusal must be ${code}, got ${failed[0].reason?.message}`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertCount(actual: number, expected: number, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}.`);
}

function assertEquals(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}: expected ${b}, received ${a}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
