import "dotenv/config";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applicationProjects,
  applications,
  assessmentAttempts,
  assessmentResponses,
  assessmentScores,
  assessments,
  challenges,
  agreements,
  matchResults,
  offers,
  projects,
  selections,
  supervisionRequests,
  users,
} from "@/db/schema";
import {
  ApplicationError,
  createApplication,
  getApplicationDetail,
  getDevelopmentApplicationActor,
  getMyApplicationForChallenge,
  listChallengeApplications,
  listMyApplications,
  reissueSupervisionRequest,
  type ApplicationErrorCode,
} from "@/services/application.service";
import type { ApplicationMutationDatabase } from "@/db/mutations/applications";
import {
  SupervisionError,
  respondToSupervisionRequest,
  type SupervisionErrorCode,
} from "@/services/supervision.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const ROLLBACK = Symbol("rollback phase 5.1 application verification");

const APP_TRIAGE = "44444444-4444-4444-8444-000000000001";
const APP_ROUTE = "44444444-4444-4444-8444-000000000002";
const APP_CHURN = "44444444-4444-4444-8444-000000000003";
const APP_OUTREACH = "44444444-4444-4444-8444-000000000004";
const APP_SUPPLY = "44444444-4444-4444-8444-000000000005";
const E_LAB_SLUG = "demo-elab-venture-readiness-dashboard";

async function main() {
  const before = await baselineCounts();
  const beforeStatus = await statusDistribution();
  const [kevinActor, phamActor, jordanAuthenticatedActor, partnerAuthenticatedActor] =
    await Promise.all([
      getAuthenticatedActorForVerification("faculty.kevin-nguyen.demo@example.test"),
      getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test"),
      getAuthenticatedActorForVerification("student.jordan-lee.demo@example.test"),
      getAuthenticatedActorForVerification("contact.bencang.demo@example.test"),
    ]);

  try {
    await db.transaction(async (tx) => {
      const options = { database: tx };
      const jordan = await getDevelopmentApplicationActor(
        "JORDAN_STUDENT_DEMO",
        options
      );
      const priya = await getDevelopmentApplicationActor(
        "PRIYA_STUDENT_DEMO",
        options
      );
      const hoang = await getDevelopmentApplicationActor(
        "HOANG_STUDENT_DEMO",
        options
      );
      const bao = await getDevelopmentApplicationActor("BAO_STUDENT_DEMO", options);
      const bencang = await getDevelopmentApplicationActor(
        "BENCANG_CONTACT_DEMO",
        options
      );
      const caid = await getDevelopmentApplicationActor("CAID_ADMIN_DEMO", options);
      const elab = await getDevelopmentApplicationActor("ELAB_ADMIN_DEMO", options);
      const [faculty] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "faculty.kevin-nguyen.demo@example.test"))
        .limit(1);
      if (!faculty) throw new Error("Verification faculty was not found.");
      const facultyId = faculty.id;
      const phamId = phamActor.user.userId;

      const myApplications = await listMyApplications(jordan, options);
      assert(myApplications.length === 7, "Jordan should see seven application rows");

      const triage = await getApplicationDetail(APP_TRIAGE, jordan, options);
      assert(triage?.status === "REJECTED", "app-triage should be REJECTED");
      assert(triage.members.length === 1, "app-triage should be solo");
      assert(
        triage.members[0].memberRole === "LEADER" &&
          triage.members[0].status === "ACCEPTED",
        "app-triage should have one accepted leader"
      );

      const route = await getApplicationDetail(APP_ROUTE, jordan, options);
      assert(route?.status === "SELECTED", "app-route should be SELECTED");
      assert(
        route.members.some(
          (member) =>
            member.fullName === "Minh Anh Nguyen" && member.status === "INVITED"
        ),
        "app-route should preserve Minh Anh Nguyen as INVITED"
      );
      assert(
        route.offerSummary?.offerStatus === "PENDING",
        "app-route should carry pending offer summary"
      );

      const churn = await getApplicationDetail(APP_CHURN, jordan, options);
      assert(
        churn?.status === "SELECTION_PENDING",
        "app-churn should remain SELECTION_PENDING"
      );
      assert(
        churn.assessmentSummaries.some(
          (summary) => summary.overallBand === "Strong"
        ),
        "app-churn should expose reviewed assessment summary"
      );

      const outreach = await getApplicationDetail(APP_OUTREACH, jordan, options);
      assert(
        outreach?.supervisionRequests.length === 1 &&
          outreach.supervisionRequests[0].status === "PENDING",
        "app-outreach should expose pending supervision request"
      );

      const supply = await getApplicationDetail(APP_SUPPLY, jordan, options);
      assert(
        supply?.projectSummary?.status === "ACTIVE",
        "app-supply should expose active downstream project summary"
      );

      const routeForPriya = await getApplicationDetail(APP_ROUTE, priya, options);
      assert(routeForPriya?.publicId === APP_ROUTE, "member should access own team application");

      await expectApplicationError(
        "unrelated student detail access",
        () => getApplicationDetail(APP_CHURN, hoang, options),
        "FORBIDDEN"
      );

      const ownerRows = await listChallengeApplications(
        "route-optimisation",
        bencang,
        options
      );
      assert(ownerRows.length === 2, "Bến Cảng should see route applications");

      const managerRows = await listChallengeApplications(
        "route-optimisation",
        caid,
        options
      );
      assert(managerRows.length === 2, "CAID should see CAID-managed route applications");

      await expectApplicationError(
        "E-Lab cannot view CAID-managed route applications",
        () => listChallengeApplications("route-optimisation", elab, options),
        "FORBIDDEN"
      );

      const studentLookup = await getMyApplicationForChallenge(
        "route-optimisation",
        jordan,
        options
      );
      assert(
        studentLookup?.publicId === APP_ROUTE,
        "student challenge lookup should return own route application"
      );

      await expectApplicationError(
        "closed challenge submission",
        async () => {
          await tx
            .update(challenges)
            .set({ status: "DRAFT" })
            .where(eq(challenges.slug, E_LAB_SLUG));
          try {
            await createApplication(baseTeamInput(facultyId), jordan, {
              ...options,
              now: demoNow(),
            });
          } finally {
            await tx
              .update(challenges)
              .set({ status: "APPLICATIONS_OPEN" })
              .where(eq(challenges.slug, E_LAB_SLUG));
          }
        },
        "INVALID_TRANSITION"
      );

      await expectApplicationError(
        "deadline validation",
        async () => {
          await tx
            .update(challenges)
            .set({ applicationDeadline: new Date("2026-08-01T00:00:00.000Z") })
            .where(eq(challenges.slug, E_LAB_SLUG));
          try {
            await createApplication(baseTeamInput(facultyId), jordan, {
              ...options,
              now: demoNow(),
            });
          } finally {
            await tx
              .update(challenges)
              .set({ applicationDeadline: new Date("2026-09-05T16:59:00.000Z") })
              .where(eq(challenges.slug, E_LAB_SLUG));
          }
        },
        "INVALID_TRANSITION"
      );

      await expectApplicationError(
        "eligibility hard failure",
        () =>
          createApplication(
            {
              challengeSlug: "triage-protocol-review",
              facultySupervisorId: facultyId,
              leaderPreferredRole: "Analysis",
              motivation: "I want to help with the protocol review.",
              teamName: null,
            },
            priya,
            { ...options, now: demoNow() }
          ),
        "VALIDATION_ERROR"
      );

      await expectApplicationError(
        "below team minimum",
        () =>
          createApplication(
            {
              challengeSlug: E_LAB_SLUG,
              facultySupervisorId: facultyId,
              leaderPreferredRole: "Data & ML",
              motivation: "I can help build a venture readiness view.",
              teamName: null,
            },
            jordan,
            { ...options, now: demoNow() }
          ),
        "VALIDATION_ERROR"
      );

      await expectApplicationError(
        "above team maximum",
        () =>
          createApplication(
            {
              ...baseTeamInput(facultyId),
              members: [
                {
                  preferredRole: "Backend",
                  status: "ACCEPTED",
                  studentEmail: "student.priya-raman.demo@example.test",
                },
                {
                  preferredRole: "Analysis",
                  status: "INVITED",
                  studentEmail: "student.minh-anh.demo@example.test",
                },
                {
                  preferredRole: "Coordination",
                  status: "INVITED",
                  studentEmail: "student.hoang-tran.demo@example.test",
                },
              ],
            },
            jordan,
            { ...options, now: demoNow() }
          ),
        "VALIDATION_ERROR"
      );

      await expectApplicationError(
        "duplicate member",
        () =>
          createApplication(
            {
              ...baseTeamInput(facultyId),
              members: [
                {
                  preferredRole: "Backend",
                  status: "ACCEPTED",
                  studentEmail: "student.priya-raman.demo@example.test",
                },
                {
                  preferredRole: "Analysis",
                  status: "INVITED",
                  studentEmail: "student.priya-raman.demo@example.test",
                },
              ],
            },
            jordan,
            { ...options, now: demoNow() }
          ),
        "VALIDATION_ERROR"
      );

      await expectApplicationError(
        "duplicate challenge application",
        () =>
          createApplication(
            {
              challengeSlug: "route-optimisation",
              facultySupervisorId: facultyId,
              leaderPreferredRole: "Data & ML",
              motivation: "I want to apply again.",
              teamName: "Duplicate Route",
              members: [
                {
                  preferredRole: "Backend",
                  status: "ACCEPTED",
                  studentEmail: "student.thao-ha.demo@example.test",
                },
              ],
            },
            jordan,
            { ...options, now: demoNow() }
          ),
        "CONFLICT"
      );

      const beforeValidCreate = await applicationCount(tx);
      const created = await createApplication(baseTeamInput(facultyId), jordan, {
        ...options,
        now: demoNow(),
      });
      assert(created.status === "SUBMITTED", "valid team create should submit");
      assert(
        created.supervisionRequests.length === 1 &&
          created.supervisionRequests[0].status === "PENDING" &&
          created.supervisionRequests[0].respondBy !== null,
        "valid create should atomically persist one pending supervision request with a deadline"
      );
      assert(
        created.supervisionRequests[0].respondBy?.toISOString() ===
          "2026-08-27T16:59:59.999Z",
        "five working days should end at campus end-of-day in Asia/Ho_Chi_Minh"
      );
      assert(created.members.length === 3, "valid team create should insert three members");
      assert(
        created.members.filter((member) => member.memberRole === "LEADER").length === 1,
        "valid team create should have exactly one leader"
      );
      assert(
        created.members.some(
          (member) => member.fullName === "Minh Anh Nguyen" && member.status === "INVITED"
        ),
        "valid team create should preserve invited member"
      );
      assert(
        (await applicationCount(tx)) === beforeValidCreate + 1,
        "valid create should increment application count inside transaction"
      );

      const [createdRequest] = await tx
        .select({
          id: supervisionRequests.id,
          respondBy: supervisionRequests.respondBy,
          status: supervisionRequests.status,
        })
        .from(supervisionRequests)
        .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
        .where(eq(applications.publicId, created.publicId));
      if (!createdRequest?.respondBy) {
        throw new Error("created supervision request should be queryable");
      }

      await expectSupervisionError(
        "wrong faculty response",
        () =>
          respondToSupervisionRequest(createdRequest.id, "ACCEPT", phamActor, {
            ...options,
            now: demoNow(),
          }),
        "CONFLICT"
      );
      await expectSupervisionError(
        "non-faculty response",
        () =>
          respondToSupervisionRequest(
            createdRequest.id,
            "ACCEPT",
            partnerAuthenticatedActor,
            { ...options, now: demoNow() }
          ),
        "FORBIDDEN"
      );
      await expectSupervisionError(
        "student response",
        () =>
          respondToSupervisionRequest(
            createdRequest.id,
            "ACCEPT",
            jordanAuthenticatedActor,
            { ...options, now: demoNow() }
          ),
        "FORBIDDEN"
      );

      const afterDeadline = new Date(createdRequest.respondBy.getTime() + 1);
      await expectSupervisionError(
        "expired response",
        () =>
          respondToSupervisionRequest(createdRequest.id, "ACCEPT", kevinActor, {
            ...options,
            now: afterDeadline,
          }),
        "DEADLINE_EXPIRED"
      );
      await expectApplicationError(
        "unrelated student reroute",
        () =>
          reissueSupervisionRequest(created.publicId, phamId, priya, {
            ...options,
            now: afterDeadline,
          }),
        "FORBIDDEN"
      );

      await reissueSupervisionRequest(created.publicId, phamId, jordan, {
        ...options,
        now: afterDeadline,
      });
      const reroutedRequests = await tx
        .select({
          facultyId: supervisionRequests.facultyId,
          id: supervisionRequests.id,
          respondBy: supervisionRequests.respondBy,
          respondedAt: supervisionRequests.respondedAt,
          status: supervisionRequests.status,
        })
        .from(supervisionRequests)
        .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
        .where(eq(applications.publicId, created.publicId));
      assert(reroutedRequests.length === 2, "reroute should append one historical request");
      const oldRequest = reroutedRequests.find((request) => request.id === createdRequest.id);
      const freshRequest = reroutedRequests.find((request) => request.id !== createdRequest.id);
      assert(
        oldRequest?.status === "PENDING" && oldRequest.respondedAt === null,
        "expired historical request should remain unchanged"
      );
      if (!freshRequest?.respondBy || freshRequest.facultyId !== phamId) {
        throw new Error(
          "reroute should target the selected active faculty with a fresh deadline"
        );
      }
      await expectApplicationError(
        "duplicate effective reroute",
        () =>
          reissueSupervisionRequest(created.publicId, phamId, jordan, {
            ...options,
            now: afterDeadline,
          }),
        "CONFLICT"
      );
      await respondToSupervisionRequest(freshRequest.id, "ACCEPT", phamActor, {
        ...options,
        now: freshRequest.respondBy,
      });
      const [acceptedAtDeadline] = await tx
        .select({
          respondedAt: supervisionRequests.respondedAt,
          status: supervisionRequests.status,
        })
        .from(supervisionRequests)
        .where(eq(supervisionRequests.id, freshRequest.id));
      assert(
        acceptedAtDeadline?.status === "ACCEPTED" &&
          acceptedAtDeadline.respondedAt?.getTime() === freshRequest.respondBy.getTime(),
        "a response at the hard deadline should be accepted and timestamped"
      );

      await tx
        .update(challenges)
        .set({ teamSizeMin: 1, teamSizeMax: 1 })
        .where(eq(challenges.slug, E_LAB_SLUG));
      const solo = await createApplication(
        {
          challengeSlug: E_LAB_SLUG,
          facultySupervisorId: facultyId,
          leaderPreferredRole: "Data & ML",
          motivation: "I can cover a small solo venture readiness analysis.",
          teamName: null,
        },
        bao,
        { ...options, now: demoNow() }
      );
      assert(solo.members.length === 1, "solo create should have one member");
      assert(
        solo.members[0].memberRole === "LEADER" &&
          solo.members[0].status === "ACCEPTED",
        "solo create should be one accepted leader"
      );
      const [soloRequest] = await tx
        .select({ id: supervisionRequests.id })
        .from(supervisionRequests)
        .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
        .where(
          and(
            eq(applications.publicId, solo.publicId),
            eq(supervisionRequests.facultyId, facultyId)
          )
        );
      assert(Boolean(soloRequest), "solo application should have a supervision request");
      const declineAt = new Date(demoNow().getTime() + 86_400_000);
      await respondToSupervisionRequest(soloRequest.id, "DECLINE", kevinActor, {
        ...options,
        now: declineAt,
      });
      await reissueSupervisionRequest(solo.publicId, phamId, bao, {
        ...options,
        now: new Date(declineAt.getTime() + 1),
      });
      const soloHistory = await tx
        .select({ status: supervisionRequests.status })
        .from(supervisionRequests)
        .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
        .where(eq(applications.publicId, solo.publicId));
      assert(
        soloHistory.length === 2 &&
          soloHistory.some((request) => request.status === "DECLINED") &&
          soloHistory.some((request) => request.status === "PENDING"),
        "decline reroute should retain the declined row and append a pending row"
      );
      await tx
        .update(challenges)
        .set({ teamSizeMin: 2, teamSizeMax: 3 })
        .where(eq(challenges.slug, E_LAB_SLUG));

      const afterFailedWrites = await baselineCounts(tx);
      assert(
        afterFailedWrites.applicationProjects === before.applicationProjects,
        "application_projects should remain unused"
      );
      assert(
        afterFailedWrites.assessmentAttempts === before.assessmentAttempts,
        "assessment attempts should not be written in Phase 5.1"
      );
      assert(
        afterFailedWrites.offers === before.offers,
        "offers should not be written in Phase 5.1"
      );
      assert(
        afterFailedWrites.projects === before.projects,
        "projects should not be written in Phase 5.1"
      );
      assert(
        afterFailedWrites.matchResults === before.matchResults,
        "matching outputs should not be written in Phase 5.1"
      );

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const after = await baselineCounts();
  const afterStatus = await statusDistribution();
  assertDeepEqual(before, after, "baseline counts should match after rollback");
  assertDeepEqual(
    beforeStatus,
    afterStatus,
    "status distribution should match after rollback"
  );

  console.log("Phase 5.1 application runtime verification passed.");
  console.log(JSON.stringify({ counts: after, statusDistribution: afterStatus }, null, 2));
}

function baseTeamInput(facultySupervisorId: bigint) {
  return {
    challengeSlug: E_LAB_SLUG,
    facultySupervisorId,
    leaderAvailabilityConfirmed: true,
    leaderCommittedHoursPerWeek: 8,
    leaderPreferredRole: "Data & ML",
    motivation: "I want to help E-Lab understand venture readiness signals.",
    relevantExperience: "I have worked with dashboards and startup data.",
    teamName: "Venture Signals",
    members: [
      {
        availabilityConfirmed: true,
        committedHoursPerWeek: 6,
        preferredRole: "Backend",
        status: "ACCEPTED" as const,
        studentEmail: "student.priya-raman.demo@example.test",
      },
      {
        committedHoursPerWeek: 5,
        preferredRole: "Analysis",
        status: "INVITED" as const,
        studentEmail: "student.minh-anh.demo@example.test",
      },
    ],
  };
}

function demoNow() {
  return new Date("2026-08-20T08:00:00.000Z");
}

async function applicationCount(database: ApplicationMutationDatabase = db) {
  const [row] = await database.select({ total: count() }).from(applications);
  return row?.total ?? 0;
}

async function baselineCounts(database: ApplicationMutationDatabase = db) {
  const rows = {
    agreements,
    applicationMembers,
    applicationProjects,
    applications,
    assessmentAttempts,
    assessmentResponses,
    assessmentScores,
    assessments,
    matchResults,
    offers,
    projects,
    selections,
    supervisionRequests,
  };

  const result: Record<string, number> = {};
  for (const [name, table] of Object.entries(rows)) {
    const [row] = await database.select({ total: count() }).from(table);
    result[name] = row?.total ?? 0;
  }

  return result;
}

async function statusDistribution(database: ApplicationMutationDatabase = db) {
  const rows = await database
    .select({ count: count(), status: applications.status })
    .from(applications)
    .groupBy(applications.status);

  return rows
    .map((row) => ({ count: row.count, status: row.status ?? "SUBMITTED" }))
    .sort((a, b) => a.status.localeCompare(b.status));
}

async function expectApplicationError(
  label: string,
  callback: () => Promise<unknown>,
  code: ApplicationErrorCode
) {
  try {
    await callback();
  } catch (error) {
    if (error instanceof ApplicationError && error.code === code) return;
    throw new Error(`${label} failed with unexpected error: ${String(error)}`);
  }

  throw new Error(`${label} should have failed with ${code}.`);
}

async function expectSupervisionError(
  label: string,
  callback: () => Promise<unknown>,
  code: SupervisionErrorCode
) {
  try {
    await callback();
  } catch (error) {
    if (error instanceof SupervisionError && error.code === code) return;
    throw new Error(`${label} failed with unexpected error: ${String(error)}`);
  }

  throw new Error(`${label} should have failed with ${code}.`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nactual=${JSON.stringify(actual)}\nexpected=${JSON.stringify(expected)}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
