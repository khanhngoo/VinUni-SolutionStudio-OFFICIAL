import "dotenv/config";

import { and, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  agreements,
  applicationMembers,
  applications,
  challenges,
  offers,
  organizations,
  projectMembers,
  projects,
  selections,
  supervisionRequests,
} from "@/db/schema";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { createApplication, toApplicationActorContext } from "@/services/application.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import {
  OfferError,
  issueSelectionOffer,
  respondToOffer,
  type OfferResponse,
} from "@/services/offer.service";
import { WorkspaceError, getWorkspaceDetail } from "@/services/workspace.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const PREFIX = "qa-667-";
const SUFFIXES = [
  "accept",
  "decline",
  "expired",
  "boundary",
  "double",
  "race",
  "rb-offer",
  "rb-project",
];

type Ctx = ReturnType<typeof toApplicationActorContext>;

interface Actors {
  bao: Ctx;
  caid: AuthenticatedActor;
  elab: AuthenticatedActor;
  faculty: AuthenticatedActor;
  facultyDiane: AuthenticatedActor;
  facultyKevin: AuthenticatedActor;
  hoang: Ctx;
  jordan: Ctx;
  owner: AuthenticatedActor;
  priya: Ctx;
  unrelatedPartner: AuthenticatedActor;
}

async function main() {
  await cleanup();
  const baseline = await counts();

  const [owner, unrelatedPartner, bao, jordan, priya, hoang, faculty, caid, elab, facultyDiane, facultyKevin] =
    await Promise.all(
      [
        "contact.bencang.demo@example.test",
        "contact.vhf.demo@example.test",
        "student.bao-tran.demo@example.test",
        "student.jordan-lee.demo@example.test",
        "student.priya-raman.demo@example.test",
        "student.hoang-tran.demo@example.test",
        "faculty.minh-pham.demo@example.test",
        "caid.admin.dev@example.test",
        "elab.admin.dev@example.test",
        "faculty.diane-osei.demo@example.test",
        "faculty.kevin-nguyen.demo@example.test",
      ].map(getAuthenticatedActorForVerification)
    );
  const actors: Actors = {
    bao: toApplicationActorContext(bao),
    caid,
    elab,
    faculty,
    facultyDiane,
    facultyKevin,
    hoang: toApplicationActorContext(hoang),
    jordan: toApplicationActorContext(jordan),
    owner,
    priya: toApplicationActorContext(priya),
    unrelatedPartner,
  };

  const ownerOrganizationId = owner.memberships.find(
    (m) => m.organizationType === "EXTERNAL_PARTNER"
  )?.organizationId;
  if (!ownerOrganizationId) throw new Error("Owner partner organization missing.");
  const [managing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, "CAID"))
    .limit(1);
  if (!managing) throw new Error("CAID organization missing.");
  const orgs = { managingOrganizationId: managing.id, ownerOrganizationId };

  try {
    await verifyAcceptTeam(orgs, actors);
    await verifyDecline(orgs, actors);
    await verifyExpiry(orgs, actors);
    await verifyConcurrency(orgs, actors);
    await verifyInjectedFailures(orgs, actors);
  } finally {
    await cleanup();
  }

  assertEquals(await counts(), baseline, "canonical counts must return to baseline");
  console.log("Phase 6.6.7 offer response / project provisioning verification passed.");
  console.log(JSON.stringify(baseline, null, 2));
}

// ---------------------------------------------------------------------------
// ACCEPT (team) + denial + workspace access + replay/conflict + chronology
// ---------------------------------------------------------------------------

async function verifyAcceptTeam(orgs: Orgs, actors: Actors) {
  const now = new Date();
  const challenge = await createChallenge("accept", orgs, actors.owner.user.userId, 2, 3);
  const created = await createApplication(
    {
      challengeSlug: challenge.slug,
      facultySupervisorId: actors.faculty.user.userId,
      leaderCommittedHoursPerWeek: 10,
      leaderPreferredRole: "Data & ML",
      members: [{ preferredRole: "Backend", status: "ACCEPTED", studentEmail: actors.priya.email }],
      motivation: "Disposable Phase 6.6.7 team verification.",
      teamName: "QA 667 Team",
    },
    actors.jordan,
    { now }
  );
  await acceptSupervision(created.publicId, actors.faculty, plus(now, 1));
  await assertStatus(created.publicId, "SELECTION_PENDING");
  await issueSelectionOffer(created.publicId, offerTerms(), actors.owner, { now: plus(now, 2) });
  const applicationId = await applicationIdFor(created.publicId);

  // Mirrors the canonical seeded pending offer, which carries an INVITED
  // member alongside its accepted roster. The product path cannot add one
  // after selection, so it is inserted directly to prove exclusion.
  await db.insert(applicationMembers).values({
    applicationId,
    memberRole: "MEMBER",
    preferredRole: "Coordination",
    status: "INVITED",
    studentId: actors.hoang.userId,
  });

  const t = plus(now, 3);
  for (const [label, actor] of [
    ["accepted non-leader", actors.priya],
    ["invited member", actors.hoang],
    ["unrelated student", actors.bao],
    ["owning partner", toApplicationActorContext(actors.owner)],
    ["supervising faculty", toApplicationActorContext(actors.faculty)],
    ["CAID admin", toApplicationActorContext(actors.caid)],
  ] as const) {
    await expectOfferError("FORBIDDEN", () => respondToOffer(created.publicId, "ACCEPT", actor, { now: t }), label);
  }
  assertCount(await projectCountFor(applicationId), 0, "denied responses must not provision");
  await assertOfferStatus(applicationId, "PENDING");

  const accepted = await respondToOffer(created.publicId, "ACCEPT", actors.jordan, { now: t });
  assert(accepted.offer.status === "ACCEPTED", "offer must become ACCEPTED");

  const [offerRow] = await db
    .select({ respondedAt: offers.respondedAt, respondedBy: offers.respondedBy, startDate: offers.startDate })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .where(eq(selections.applicationId, applicationId));
  assert(offerRow.respondedBy === actors.jordan.userId, "responded_by must be the server-derived leader");
  assert(offerRow.respondedAt?.getTime() === t.getTime(), "responded_at must be server time");

  const [project] = await db
    .select({
      applicationId: projects.applicationId,
      facultySupervisorId: projects.facultySupervisorId,
      id: projects.id,
      startDate: projects.startDate,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.applicationId, applicationId));
  assertCount(await projectCountFor(applicationId), 1, "exactly one project");
  assert(project.status === "ACTIVE", "project must start ACTIVE");
  assert(project.startDate === offerRow.startDate, "project start must snapshot the offer start");
  assert(
    project.facultySupervisorId === actors.faculty.user.userId,
    "supervisor must be the faculty on the ACCEPTED supervision request"
  );

  const members = await db
    .select({ projectRole: projectMembers.projectRole, studentId: projectMembers.studentId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, project.id));
  const memberIds = members.map((m) => m.studentId.toString()).sort();
  const expected = [actors.jordan.userId, actors.priya.userId].map(String).sort();
  assertEquals(memberIds, expected, "project members must equal ACCEPTED application members");
  assert(!memberIds.includes(actors.hoang.userId.toString()), "invited member must be excluded");
  assert(
    members.find((m) => m.studentId === actors.priya.userId)?.projectRole === "Backend",
    "project role must carry the member's committed preferred role"
  );
  await assertStatus(created.publicId, "SELECTED");
  assertCount(await agreementCountFor(applicationId), 0, "acceptance must not fabricate agreements");

  // Workspace reachable immediately through the normal DB-backed path.
  const allowed: Array<[string, Ctx]> = [
    ["leader", actors.jordan],
    ["accepted teammate", actors.priya],
    ["supervisor", toApplicationActorContext(actors.faculty)],
    ["owning partner", toApplicationActorContext(actors.owner)],
    ["managing-unit admin", toApplicationActorContext(actors.caid)],
  ];
  for (const [label, actor] of allowed) {
    const detail = await getWorkspaceDetail(created.publicId, actor);
    assert(detail?.projectStatus === "ACTIVE", `${label} must open the new workspace`);
  }
  const denied: Array<[string, Ctx]> = [
    ["invited member", actors.hoang],
    ["unrelated student", actors.bao],
    ["unrelated partner", toApplicationActorContext(actors.unrelatedPartner)],
    ["unrelated internal admin", toApplicationActorContext(actors.elab)],
  ];
  for (const [label, actor] of denied) {
    await expectWorkspaceForbidden(() => getWorkspaceDetail(created.publicId, actor), label);
  }

  // Replay is idempotent; a conflicting terminal response is refused.
  const replay = await respondToOffer(created.publicId, "ACCEPT", actors.jordan, { now: plus(now, 4) });
  assert(replay.offer.status === "ACCEPTED", "replay must report the accepted offer");
  await expectOfferError(
    "INVALID_TRANSITION",
    () => respondToOffer(created.publicId, "DECLINE", actors.jordan, { now: plus(now, 4) }),
    "decline after accept"
  );
  await assertOfferStatus(applicationId, "ACCEPTED");
  assertCount(await projectCountFor(applicationId), 1, "replay must not create a second project");
  assertCount(await projectMemberCountFor(applicationId), 2, "replay must not duplicate members");

  // Chronology and FK chain.
  const [chain] = await db.execute(sql`
    select c.id as challenge_id, a.submitted_at, s.selected_at, o.created_at as offered_at,
           o.responded_at, p.created_at as project_created_at
    from projects p
    join applications a on a.id = p.application_id
    join challenges c on c.id = a.challenge_id
    join selections s on s.application_id = a.id
    join offers o on o.selection_id = s.id
    where a.id = ${applicationId}
  `).then((result) => result.rows as Array<Record<string, unknown>>);
  assert(String(chain.challenge_id) === String(challenge.id), "project must trace back to the challenge via the application");
  const order = ["submitted_at", "selected_at", "responded_at", "project_created_at"].map((k) =>
    new Date(String(chain[k])).getTime()
  );
  assert(order.every((v, i) => i === 0 || order[i - 1] <= v), "challenge → application → selection → offer → project chronology");
}

// ---------------------------------------------------------------------------
// DECLINE
// ---------------------------------------------------------------------------

async function verifyDecline(orgs: Orgs, actors: Actors) {
  const now = new Date();
  const publicId = await pendingSoloOffer("decline", orgs, actors, now);
  const applicationId = await applicationIdFor(publicId);

  const declined = await respondToOffer(publicId, "DECLINE", actors.bao, { now: plus(now, 3) });
  assert(declined.offer.status === "DECLINED", "offer must become DECLINED");
  assert(declined.offer.respondedByName !== null, "decline must record the responder");
  assertCount(await projectCountFor(applicationId), 0, "decline must not provision");
  await assertStatus(publicId, "SELECTED");

  const replay = await respondToOffer(publicId, "DECLINE", actors.bao, { now: plus(now, 4) });
  assert(replay.offer.status === "DECLINED", "decline replay is idempotent");
  await expectOfferError(
    "INVALID_TRANSITION",
    () => respondToOffer(publicId, "ACCEPT", actors.bao, { now: plus(now, 4) }),
    "accept after decline"
  );
  await assertOfferStatus(applicationId, "DECLINED");
  assertCount(await projectCountFor(applicationId), 0, "accept after decline must not provision");
}

// ---------------------------------------------------------------------------
// EXPIRY and the exact boundary
// ---------------------------------------------------------------------------

async function verifyExpiry(orgs: Orgs, actors: Actors) {
  const now = new Date();
  const publicId = await pendingSoloOffer("expired", orgs, actors, now);
  const applicationId = await applicationIdFor(publicId);
  const respondBy = await respondByFor(applicationId);
  const after = new Date(respondBy.getTime() + 60_000);

  for (const response of ["ACCEPT", "DECLINE"] as OfferResponse[]) {
    await expectOfferError(
      "INVALID_TRANSITION",
      () => respondToOffer(publicId, response, actors.bao, { now: after }),
      `${response} after respond_by`
    );
  }
  await assertOfferStatus(applicationId, "PENDING");
  assertCount(await projectCountFor(applicationId), 0, "expired offer must not provision");

  const boundaryId = await pendingSoloOffer("boundary", orgs, actors, now);
  const boundaryAppId = await applicationIdFor(boundaryId);
  const boundaryAt = await respondByFor(boundaryAppId);
  await respondToOffer(boundaryId, "ACCEPT", actors.bao, { now: boundaryAt });
  assertCount(await projectCountFor(boundaryAppId), 1, "accept exactly at respond_by is still within the window");
}

// ---------------------------------------------------------------------------
// CONCURRENCY
// ---------------------------------------------------------------------------

async function verifyConcurrency(orgs: Orgs, actors: Actors) {
  const now = new Date();

  const doubleId = await pendingSoloOffer("double", orgs, actors, now, actors.facultyDiane);
  const doubleAppId = await applicationIdFor(doubleId);
  const results = await Promise.allSettled(
    [0, 1, 2].map(() => respondToOffer(doubleId, "ACCEPT", actors.bao, { now: plus(now, 3) }))
  );
  assert(results.every((r) => r.status === "fulfilled"), "concurrent identical accepts all resolve (one fresh, others replay)");
  assertCount(await projectCountFor(doubleAppId), 1, "concurrent accepts create exactly one project");
  assertCount(await projectMemberCountFor(doubleAppId), 1, "concurrent accepts create exactly one member set");

  const raceId = await pendingSoloOffer("race", orgs, actors, now, actors.facultyDiane);
  const raceAppId = await applicationIdFor(raceId);
  const race = await Promise.allSettled([
    respondToOffer(raceId, "ACCEPT", actors.bao, { now: plus(now, 3) }),
    respondToOffer(raceId, "DECLINE", actors.bao, { now: plus(now, 3) }),
  ]);
  const won = race.filter((r) => r.status === "fulfilled");
  const lost = race.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  assert(won.length === 1 && lost.length === 1, "accept vs decline: exactly one terminal response");
  assert(
    lost[0].reason instanceof OfferError && lost[0].reason.code === "INVALID_TRANSITION",
    "the losing response must be a controlled INVALID_TRANSITION"
  );
  const final = await offerStatusFor(raceAppId);
  assertCount(
    await projectCountFor(raceAppId),
    final === "ACCEPTED" ? 1 : 0,
    "project exists iff ACCEPT won the race"
  );
}

// ---------------------------------------------------------------------------
// INJECTED FAILURES
// ---------------------------------------------------------------------------

async function verifyInjectedFailures(orgs: Orgs, actors: Actors) {
  const now = new Date();

  const afterOfferId = await pendingSoloOffer("rb-offer", orgs, actors, now, actors.facultyKevin);
  const afterOfferApp = await applicationIdFor(afterOfferId);
  await expectThrows(
    () =>
      respondToOffer(afterOfferId, "ACCEPT", actors.bao, {
        injectFailureAfterOfferResponse: () => {
          throw new Error("injected after offer response");
        },
        now: plus(now, 3),
      }),
    "injected after offer response"
  );
  await assertOfferStatus(afterOfferApp, "PENDING");
  assertCount(await projectCountFor(afterOfferApp), 0, "failure after offer update leaves no project");

  const afterProjectId = await pendingSoloOffer("rb-project", orgs, actors, now, actors.facultyKevin);
  const afterProjectApp = await applicationIdFor(afterProjectId);
  await expectThrows(
    () =>
      respondToOffer(afterProjectId, "ACCEPT", actors.bao, {
        injectFailureAfterProjectInsert: () => {
          throw new Error("injected after project insert");
        },
        now: plus(now, 3),
      }),
    "injected after project insert"
  );
  await assertOfferStatus(afterProjectApp, "PENDING");
  assertCount(await projectCountFor(afterProjectApp), 0, "failure after project insert rolls the project back");
  assertCount(await projectMemberCountFor(afterProjectApp), 0, "failure after project insert leaves no members");

  // The rolled-back offer is still genuinely actionable afterwards.
  await respondToOffer(afterProjectId, "ACCEPT", actors.bao, { now: plus(now, 4) });
  assertCount(await projectCountFor(afterProjectApp), 1, "a clean retry after rollback provisions normally");
}

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

interface Orgs {
  managingOrganizationId: bigint;
  ownerOrganizationId: bigint;
}

function offerTerms() {
  return {
    compensationNote: "Disposable Phase 6.6.7 verification offer.",
    durationWeeks: 8,
    hoursPerWeek: 10,
    ndaRequired: false,
    respondByWorkingDays: 5,
    startDate: "2026-10-26",
  };
}

// Runtime-provisioned projects count toward a supervisor's load cap, so
// fixture groups are spread across seeded faculty rather than exhausting one.
async function pendingSoloOffer(
  suffix: string,
  orgs: Orgs,
  actors: Actors,
  now: Date,
  supervisor: AuthenticatedActor = actors.faculty
) {
  const challenge = await createChallenge(suffix, orgs, actors.owner.user.userId, 1, 1);
  const created = await createApplication(
    {
      challengeSlug: challenge.slug,
      facultySupervisorId: supervisor.user.userId,
      leaderCommittedHoursPerWeek: 10,
      motivation: "Disposable Phase 6.6.7 solo verification.",
      teamName: null,
    },
    actors.bao,
    { now }
  );
  await acceptSupervision(created.publicId, supervisor, plus(now, 1));
  await issueSelectionOffer(created.publicId, offerTerms(), actors.owner, { now: plus(now, 2) });
  return created.publicId;
}

async function createChallenge(
  suffix: string,
  orgs: Orgs,
  contactPersonId: bigint,
  teamSizeMin: number,
  teamSizeMax: number
) {
  const [challenge] = await db
    .insert(challenges)
    .values({
      applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
      contactPersonId,
      description: "Disposable Phase 6.6.7 provisioning verification challenge.",
      managingOrganizationId: orgs.managingOrganizationId,
      ownerOrganizationId: orgs.ownerOrganizationId,
      slug: `${PREFIX}${suffix}`,
      status: "APPLICATIONS_OPEN",
      summary: "Disposable provisioning verification.",
      teamSizeMax,
      teamSizeMin,
      title: `QA 667 ${suffix}`,
      visibility: "VINUNI_ONLY",
      weeklyHours: 10,
    })
    .returning({ id: challenges.id, slug: challenges.slug });
  if (!challenge?.slug) throw new Error("Disposable challenge creation failed.");
  return { id: challenge.id, slug: challenge.slug };
}

async function acceptSupervision(publicId: string, faculty: AuthenticatedActor, now: Date) {
  const [request] = await db
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.publicId, publicId))
    .limit(1);
  if (!request) throw new Error("Supervision request missing.");
  await respondToSupervisionRequest(request.id, "ACCEPT", faculty, { now });
}

async function applicationIdFor(publicId: string) {
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.publicId, publicId))
    .limit(1);
  if (!row) throw new Error("Application missing.");
  return row.id;
}

async function assertStatus(publicId: string, expected: string) {
  const [row] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.publicId, publicId))
    .limit(1);
  assert(row?.status === expected, `application ${publicId} expected ${expected}, got ${row?.status}`);
}

async function offerStatusFor(applicationId: bigint) {
  const [row] = await db
    .select({ status: offers.status })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .where(eq(selections.applicationId, applicationId));
  return row?.status ?? null;
}

async function assertOfferStatus(applicationId: bigint, expected: string) {
  const status = await offerStatusFor(applicationId);
  assert(status === expected, `offer expected ${expected}, got ${status}`);
}

async function respondByFor(applicationId: bigint) {
  const [row] = await db
    .select({ respondBy: offers.respondBy })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .where(eq(selections.applicationId, applicationId));
  if (!row?.respondBy) throw new Error("respond_by missing.");
  return row.respondBy;
}

async function projectCountFor(applicationId: bigint) {
  const [row] = await db.select({ total: count() }).from(projects).where(eq(projects.applicationId, applicationId));
  return Number(row?.total ?? 0);
}

async function projectMemberCountFor(applicationId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projects.applicationId, applicationId));
  return Number(row?.total ?? 0);
}

async function agreementCountFor(applicationId: bigint) {
  const [row] = await db.select({ total: count() }).from(agreements).where(eq(agreements.applicationId, applicationId));
  return Number(row?.total ?? 0);
}

async function counts() {
  const tables = {
    agreements,
    applicationMembers,
    applications,
    challenges,
    offers,
    projectMembers,
    projects,
    selections,
    supervisionRequests,
  };
  const entries = await Promise.all(
    Object.entries(tables).map(async ([name, table]) => {
      const [row] = await db.select({ total: count() }).from(table);
      return [name, Number(row?.total ?? 0)] as const;
    })
  );
  return Object.fromEntries(entries);
}

async function cleanup() {
  const slugs = SUFFIXES.map((suffix) => `${PREFIX}${suffix}`);
  await db.transaction(async (tx) => {
    const challengeIds = (
      await tx.select({ id: challenges.id }).from(challenges).where(inArray(challenges.slug, slugs))
    ).map((row) => row.id);
    if (challengeIds.length === 0) return;
    const applicationIds = (
      await tx.select({ id: applications.id }).from(applications).where(inArray(applications.challengeId, challengeIds))
    ).map((row) => row.id);
    if (applicationIds.length > 0) {
      await tx.delete(projects).where(inArray(projects.applicationId, applicationIds));
      const selectionIds = (
        await tx.select({ id: selections.id }).from(selections).where(inArray(selections.applicationId, applicationIds))
      ).map((row) => row.id);
      if (selectionIds.length > 0) {
        await tx.delete(offers).where(inArray(offers.selectionId, selectionIds));
        await tx.delete(selections).where(inArray(selections.id, selectionIds));
      }
      await tx.delete(agreements).where(and(inArray(agreements.applicationId, applicationIds)));
      await tx.delete(applications).where(inArray(applications.id, applicationIds));
    }
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

function plus(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60_000);
}

async function expectOfferError(code: OfferError["code"], action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof OfferError && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
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

async function expectThrows(action: () => Promise<unknown>, message: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof Error && error.message === message) return;
    throw error;
  }
  throw new Error(`Expected "${message}" to be thrown.`);
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
