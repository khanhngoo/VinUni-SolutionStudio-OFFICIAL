import { and, eq, inArray } from "drizzle-orm";

import {
  applicationMembers,
  applications,
  supervisionRequests,
} from "../schema";
import type { SeedContext } from "./context";
import { shiftIso } from "./clock";

type ApplicationStatus =
  | "SUBMITTED"
  | "SHORTLISTED"
  | "ASSESSMENT"
  | "SELECTION_PENDING"
  | "SELECTED"
  | "REJECTED"
  | "WITHDRAWN";

type ApplicationMemberRole = "LEADER" | "MEMBER";
type ApplicationMemberStatus = "INVITED" | "ACCEPTED" | "DECLINED" | "REMOVED";
type SupervisionRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

interface DemoApplicationMemberSeed {
  invitedAt: string | null;
  memberRole: ApplicationMemberRole;
  preferredRole: string;
  status: ApplicationMemberStatus;
  studentUserKey: string;
}

interface DemoApplicationSeed {
  appliedAt: string;
  challengeSlug: string;
  key: string;
  members: DemoApplicationMemberSeed[];
  publicId: string;
  sourceFixtureId: string;
  stageEnteredAt: string;
  status: ApplicationStatus;
  submittedByUserKey: string;
  teamName: string | null;
}

interface DemoSupervisionRequestSeed {
  applicationKey: string;
  comments: string;
  facultyUserKey: string;
  key: string;
  requestedAt: string;
  requestedByUserKey: string;
  respondBy: string;
  status: SupervisionRequestStatus;
}

const JORDAN = "user:stu-jordan-lee";

export const DEMO_APPLICATIONS: DemoApplicationSeed[] = [
  {
    key: "application:app-triage",
    sourceFixtureId: "app-triage",
    publicId: "44444444-4444-4444-8444-000000000001",
    challengeSlug: "triage-protocol-review",
    submittedByUserKey: JORDAN,
    teamName: "Triage Review",
    status: "ASSESSMENT",
    appliedAt: "2026-06-18",
    stageEnteredAt: "2026-07-06",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Research",
        invitedAt: null,
      },
    ],
  },
  {
    key: "application:app-route",
    sourceFixtureId: "app-route",
    publicId: "44444444-4444-4444-8444-000000000002",
    challengeSlug: "route-optimisation",
    submittedByUserKey: JORDAN,
    teamName: "Last Mile",
    status: "SELECTION_PENDING",
    appliedAt: "2026-06-30",
    stageEnteredAt: "2026-07-26",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Data & ML",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-priya-raman",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Backend",
        invitedAt: "2026-07-24",
      },
      {
        studentUserKey: "user:stu-minh-anh",
        memberRole: "MEMBER",
        status: "INVITED",
        preferredRole: "Domain expert",
        invitedAt: "2026-07-25",
      },
    ],
  },
  {
    key: "application:app-churn",
    sourceFixtureId: "app-churn",
    publicId: "44444444-4444-4444-8444-000000000003",
    challengeSlug: "merchant-churn-model",
    submittedByUserKey: JORDAN,
    teamName: "Retention Two",
    status: "SELECTION_PENDING",
    appliedAt: "2026-07-02",
    stageEnteredAt: "2026-07-21",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Data & ML",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-priya-raman",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Analysis",
        invitedAt: "2026-07-18",
      },
    ],
  },
  {
    key: "application:app-outreach",
    sourceFixtureId: "app-outreach",
    publicId: "44444444-4444-4444-8444-000000000004",
    challengeSlug: "community-health-outreach",
    submittedByUserKey: JORDAN,
    teamName: "Outreach Metrics",
    status: "SUBMITTED",
    appliedAt: "2026-07-25",
    stageEnteredAt: "2026-07-25",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Analysis",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-hoang-tran",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Coordination",
        invitedAt: "2026-07-24",
      },
    ],
  },
  {
    key: "application:app-supply",
    sourceFixtureId: "app-supply",
    publicId: "44444444-4444-4444-8444-000000000005",
    challengeSlug: "supply-chain-dashboard",
    submittedByUserKey: JORDAN,
    teamName: "Warehouse Four",
    status: "SELECTION_PENDING",
    appliedAt: "2026-05-20",
    stageEnteredAt: "2026-06-22",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Data & ML",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-priya-raman",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Backend",
        invitedAt: "2026-06-14",
      },
      {
        studentUserKey: "user:stu-minh-anh",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Analysis",
        invitedAt: "2026-06-14",
      },
    ],
  },
  {
    key: "application:app-energy",
    sourceFixtureId: "app-energy",
    publicId: "44444444-4444-4444-8444-000000000006",
    challengeSlug: "campus-energy-audit",
    submittedByUserKey: JORDAN,
    teamName: "Kilowatt",
    status: "SELECTION_PENDING",
    appliedAt: "2026-03-10",
    stageEnteredAt: "2026-07-18",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Analysis",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-hoang-tran",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Coordination",
        invitedAt: "2026-04-06",
      },
    ],
  },
  {
    key: "application:app-archive",
    sourceFixtureId: "app-archive",
    publicId: "44444444-4444-4444-8444-000000000007",
    challengeSlug: "archive-digitisation",
    submittedByUserKey: JORDAN,
    teamName: "Long Record",
    status: "SELECTION_PENDING",
    appliedAt: "2025-11-14",
    stageEnteredAt: "2026-05-29",
    members: [
      {
        studentUserKey: JORDAN,
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Backend",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-linh-pham",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Design",
        invitedAt: "2026-01-08",
      },
      {
        studentUserKey: "user:stu-thao-ha",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Research",
        invitedAt: "2026-01-08",
      },
    ],
  },
  {
    key: "application:papp-depot",
    sourceFixtureId: "papp-depot",
    publicId: "44444444-4444-4444-8444-000000000008",
    challengeSlug: "route-optimisation",
    submittedByUserKey: "user:stu-bao-tran",
    teamName: "Depot",
    status: "SELECTION_PENDING",
    appliedAt: "2026-05-20",
    stageEnteredAt: "2026-06-12",
    members: [
      {
        studentUserKey: "user:stu-bao-tran",
        memberRole: "LEADER",
        status: "ACCEPTED",
        preferredRole: "Data & ML",
        invitedAt: null,
      },
      {
        studentUserKey: "user:stu-hoang-tran",
        memberRole: "MEMBER",
        status: "ACCEPTED",
        preferredRole: "Coordination",
        invitedAt: "2026-06-02",
      },
    ],
  },
];

const DEMO_SUPERVISION_REQUESTS: DemoSupervisionRequestSeed[] = [
  {
    key: "supervision-request:inv-outreach",
    applicationKey: "application:app-outreach",
    facultyUserKey: "user:fac-pham",
    requestedByUserKey: JORDAN,
    status: "PENDING",
    requestedAt: "2026-07-25",
    respondBy: "2026-08-01",
    comments:
      "DEMO application-level supervision request from inv-outreach. Distinct from challenge faculty routing.",
  },
];

function utcDate(date: string) {
  return shiftIso(date);
}

function memberRespondedAt(seed: DemoApplicationSeed, member: DemoApplicationMemberSeed) {
  if (member.status !== "ACCEPTED") return null;
  if (member.invitedAt) return utcDate(member.invitedAt);
  return utcDate(seed.appliedAt);
}

async function ensureDemoApplication(ctx: SeedContext, seed: DemoApplicationSeed) {
  const submittedAt = utcDate(seed.appliedAt);
  const updatedAt = utcDate(seed.stageEnteredAt);

  if (submittedAt > updatedAt) {
    throw new Error(
      `Refusing to seed ${seed.key}: appliedAt must be before or equal to stageEnteredAt.`
    );
  }

  const [application] = await ctx.tx
    .insert(applications)
    .values({
      challengeId: ctx.getId(`challenge:${seed.challengeSlug}`),
      createdAt: submittedAt,
      motivation: null,
      publicId: seed.publicId,
      relevantExperience: null,
      status: seed.status,
      submittedAt,
      submittedBy: ctx.getId(seed.submittedByUserKey),
      teamName: seed.teamName,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: applications.publicId,
      set: {
        challengeId: ctx.getId(`challenge:${seed.challengeSlug}`),
        createdAt: submittedAt,
        motivation: null,
        relevantExperience: null,
        status: seed.status,
        submittedAt,
        submittedBy: ctx.getId(seed.submittedByUserKey),
        teamName: seed.teamName,
        updatedAt,
      },
    })
    .returning({ id: applications.id });

  ctx.setId(seed.key, application.id);
  return application.id;
}

async function ensureDemoApplicationMember(
  ctx: SeedContext,
  applicationId: bigint,
  applicationSeed: DemoApplicationSeed,
  memberSeed: DemoApplicationMemberSeed
) {
  const invitedAt = memberSeed.invitedAt ? utcDate(memberSeed.invitedAt) : null;
  const respondedAt = memberRespondedAt(applicationSeed, memberSeed);
  const createdAt = invitedAt ?? utcDate(applicationSeed.appliedAt);
  const updatedAt = respondedAt ?? invitedAt ?? utcDate(applicationSeed.stageEnteredAt);
  const studentId = ctx.getId(memberSeed.studentUserKey);

  await ctx.tx
    .insert(applicationMembers)
    .values({
      applicationId,
      availabilityConfirmed: null,
      committedHoursPerWeek: null,
      createdAt,
      invitedAt,
      memberRole: memberSeed.memberRole,
      preferredRole: memberSeed.preferredRole,
      respondedAt,
      status: memberSeed.status,
      studentId,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [applicationMembers.applicationId, applicationMembers.studentId],
      set: {
        availabilityConfirmed: null,
        committedHoursPerWeek: null,
        invitedAt,
        memberRole: memberSeed.memberRole,
        preferredRole: memberSeed.preferredRole,
        respondedAt,
        status: memberSeed.status,
        updatedAt,
      },
    });
}

async function ensureDemoSupervisionRequest(
  ctx: SeedContext,
  seed: DemoSupervisionRequestSeed
) {
  const applicationId = ctx.getId(seed.applicationKey);
  const facultyId = ctx.getId(seed.facultyUserKey);
  const requestedBy = ctx.getId(seed.requestedByUserKey);

  const existing = await ctx.tx
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .where(
      and(
        eq(supervisionRequests.applicationId, applicationId),
        eq(supervisionRequests.facultyId, facultyId),
        eq(supervisionRequests.requestedBy, requestedBy)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed ${seed.key}: duplicate supervision requests already exist.`
    );
  }

  const values = {
    applicationId,
    comments: seed.comments,
    facultyId,
    requestedAt: utcDate(seed.requestedAt),
    requestedBy,
    respondBy: utcDate(seed.respondBy),
    respondedAt: null,
    status: seed.status,
  };

  if (existing[0]) {
    await ctx.tx
      .update(supervisionRequests)
      .set(values)
      .where(eq(supervisionRequests.id, existing[0].id));
    ctx.setId(seed.key, existing[0].id);
    return;
  }

  const [created] = await ctx.tx
    .insert(supervisionRequests)
    .values(values)
    .returning({ id: supervisionRequests.id });

  ctx.setId(seed.key, created.id);
}

async function validateDemoApplications(ctx: SeedContext) {
  const applicationIds = DEMO_APPLICATIONS.map((seed) => ctx.getId(seed.key));
  const seededApplications = await ctx.tx
    .select({
      id: applications.id,
      publicId: applications.publicId,
      status: applications.status,
      submittedAt: applications.submittedAt,
      submittedBy: applications.submittedBy,
      teamName: applications.teamName,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(inArray(applications.id, applicationIds));

  const seededMembers = await ctx.tx
    .select({
      applicationId: applicationMembers.applicationId,
      memberRole: applicationMembers.memberRole,
      status: applicationMembers.status,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .where(inArray(applicationMembers.applicationId, applicationIds));

  for (const seed of DEMO_APPLICATIONS) {
    const applicationId = ctx.getId(seed.key);
    const application = seededApplications.find((row) => row.id === applicationId);
    const members = seededMembers.filter((row) => row.applicationId === applicationId);

    if (!application) {
      throw new Error(`Seed validation failed: missing application ${seed.key}.`);
    }

    if (
      application.createdAt &&
      application.submittedAt &&
      application.updatedAt &&
      !(
        application.createdAt <= application.submittedAt &&
        application.submittedAt <= application.updatedAt
      )
    ) {
      throw new Error(
        `Seed validation failed: incoherent timestamps for ${seed.key}.`
      );
    }

    if (application.status === "SELECTED" || application.status === "REJECTED") {
      throw new Error(
        `Seed validation failed: ${seed.key} reached downstream status ${application.status}.`
      );
    }

    if (!members.some((member) => member.studentId === application.submittedBy)) {
      throw new Error(
        `Seed validation failed: submitted_by is not an application member for ${seed.key}.`
      );
    }

    const duplicateStudentIds = new Set<bigint>();
    const seenStudentIds = new Set<bigint>();
    for (const member of members) {
      if (seenStudentIds.has(member.studentId)) duplicateStudentIds.add(member.studentId);
      seenStudentIds.add(member.studentId);
    }

    if (duplicateStudentIds.size > 0) {
      throw new Error(`Seed validation failed: duplicate members for ${seed.key}.`);
    }

    const leaders = members.filter((member) => member.memberRole === "LEADER");
    if (leaders.length !== 1 || leaders[0].status !== "ACCEPTED") {
      throw new Error(
        `Seed validation failed: ${seed.key} must have exactly one accepted leader.`
      );
    }
  }

  const triageId = ctx.getId("application:app-triage");
  const triageMembers = seededMembers.filter((row) => row.applicationId === triageId);
  if (
    triageMembers.length !== 1 ||
    triageMembers[0].memberRole !== "LEADER" ||
    triageMembers[0].status !== "ACCEPTED"
  ) {
    throw new Error("Seed validation failed: app-triage must remain a solo application.");
  }

  const routeId = ctx.getId("application:app-route");
  const routeMembers = seededMembers.filter((row) => row.applicationId === routeId);
  const invitedRouteMembers = routeMembers.filter((row) => row.status === "INVITED");
  if (invitedRouteMembers.length !== 1) {
    throw new Error(
      "Seed validation failed: app-route must preserve exactly one pending invited member."
    );
  }
}

export async function seedDemoApplications(ctx: SeedContext) {
  for (const seed of DEMO_APPLICATIONS) {
    const applicationId = await ensureDemoApplication(ctx, seed);

    for (const member of seed.members) {
      await ensureDemoApplicationMember(ctx, applicationId, seed, member);
    }
  }

  for (const seed of DEMO_SUPERVISION_REQUESTS) {
    await ensureDemoSupervisionRequest(ctx, seed);
  }

  await validateDemoApplications(ctx);

  ctx.record("DEMO", "applications", DEMO_APPLICATIONS.length);
  ctx.record(
    "DEMO",
    "application members",
    DEMO_APPLICATIONS.reduce((total, seed) => total + seed.members.length, 0)
  );
  ctx.record("DEMO", "application projects", 0);
  ctx.record("DEMO", "supervision requests", DEMO_SUPERVISION_REQUESTS.length);
}
