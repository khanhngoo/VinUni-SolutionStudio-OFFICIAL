import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  applicationMembers,
  deliverables,
  feedback,
  milestoneReviews,
  milestones,
  offers,
  projectMembers,
  projectResources,
  projects,
  selections,
} from "../schema";
import type { SeedContext } from "./context";

type ProjectStatus = "ACTIVE" | "FINAL_REVIEW" | "COMPLETED";
type MilestoneStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "COMPLETED";
type DeliverableType = "TEXT";
type ReviewRole = "FACULTY" | "PARTNER";
type ReviewDecision = "APPROVED" | "REVISION_REQUESTED";
type ResourceSensitivity = "TEAM_ONLY" | "RESTRICTED";

interface DeliverableSeed {
  description: string;
  submittedAt: Date;
  submittedByUserKey: string;
  title: string;
  type: DeliverableType;
}

interface ReviewSeed {
  comments: string;
  createdAt: Date;
  decision: ReviewDecision;
  reviewerOrganizationKey: string | null;
  reviewerRole: ReviewRole;
  reviewerUserKey: string;
}

interface MilestoneSeed {
  deadline: string;
  deliverable?: DeliverableSeed;
  description: string;
  key: string;
  reviews: ReviewSeed[];
  status: MilestoneStatus;
  title: string;
}

interface ResourceSeed {
  createdAt: Date;
  createdByUserKey: string;
  description: string;
  requiresAgreement: boolean;
  resourceType: string;
  sensitivity: ResourceSensitivity;
  storageKey: string | null;
  title: string;
}

interface ProjectSeed {
  applicationKey: string;
  endDate: string | null;
  facultySupervisorUserKey: string;
  key: string;
  milestones: MilestoneSeed[];
  publicId: string;
  resources: ResourceSeed[];
  sourceFixtureId: string;
  startDate: string;
  status: ProjectStatus;
  updatedAt: Date;
}

function atUtc(iso: string) {
  return new Date(iso);
}

function submittedByLeader(
  title: string,
  description: string,
  submittedAt: string
): DeliverableSeed {
  return {
    description,
    submittedAt: atUtc(submittedAt),
    submittedByUserKey: "leader",
    title,
    type: "TEXT",
  };
}

function facultyApproval(
  reviewerUserKey: string,
  createdAt: string,
  comments: string,
  decision: ReviewDecision = "APPROVED"
): ReviewSeed {
  return {
    comments,
    createdAt: atUtc(createdAt),
    decision,
    reviewerOrganizationKey: null,
    reviewerRole: "FACULTY",
    reviewerUserKey,
  };
}

function partnerReview(
  reviewerUserKey: string,
  reviewerOrganizationKey: string,
  createdAt: string,
  comments: string,
  decision: ReviewDecision = "APPROVED"
): ReviewSeed {
  return {
    comments,
    createdAt: atUtc(createdAt),
    decision,
    reviewerOrganizationKey,
    reviewerRole: "PARTNER",
    reviewerUserKey,
  };
}

function restrictedResource(
  title: string,
  description: string,
  resourceType: string,
  storageKey: string | null,
  createdByUserKey: string,
  createdAt: string
): ResourceSeed {
  return {
    createdAt: atUtc(createdAt),
    createdByUserKey,
    description,
    requiresAgreement: true,
    resourceType,
    sensitivity: "RESTRICTED",
    storageKey,
    title,
  };
}

function teamResource(
  title: string,
  description: string,
  resourceType: string,
  storageKey: string | null,
  createdByUserKey: string,
  createdAt: string
): ResourceSeed {
  return {
    createdAt: atUtc(createdAt),
    createdByUserKey,
    description,
    requiresAgreement: false,
    resourceType,
    sensitivity: "TEAM_ONLY",
    storageKey,
    title,
  };
}

export const DEMO_PROJECTS: ProjectSeed[] = [
  {
    key: "project:app-supply",
    sourceFixtureId: "app-supply",
    applicationKey: "application:app-supply",
    publicId: "55555555-5555-4555-8555-000000000001",
    facultySupervisorUserKey: "user:fac-pham",
    status: "ACTIVE",
    startDate: "2026-06-22",
    endDate: null,
    updatedAt: atUtc("2026-07-27T00:00:00.000Z"),
    milestones: [
      {
        key: "ms-1",
        title: "Data audit and source mapping",
        description: "Written audit of the four inbound data sources.",
        deadline: "2026-07-03",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Data audit and source mapping deliverable",
          "Written audit of the four inbound data sources.",
          "2026-07-03T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-pham",
            "2026-07-04T09:00:00.000Z",
            "Faculty sign-off for the source audit."
          ),
          partnerReview(
            "user:contact-org-bencang",
            "org:demo-bencang",
            "2026-07-04T10:00:00.000Z",
            "Partner sign-off for the source audit."
          ),
        ],
      },
      {
        key: "ms-2",
        title: "Warehouse schema and ingestion",
        description: "Schema diagram and ingestion scripts.",
        deadline: "2026-07-20",
        status: "REVISION_REQUESTED",
        deliverable: submittedByLeader(
          "Warehouse schema and ingestion deliverable",
          "Schema diagram and ingestion scripts.",
          "2026-07-20T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-pham",
            "2026-07-21T09:00:00.000Z",
            "Faculty approved the schema direction."
          ),
          partnerReview(
            "user:contact-org-bencang",
            "org:demo-bencang",
            "2026-07-21T10:00:00.000Z",
            "Partner requested revisions before accepting the ingestion handoff.",
            "REVISION_REQUESTED"
          ),
        ],
      },
      {
        key: "ms-3",
        title: "Forecast module",
        description: "Notebook and short methodology memo.",
        deadline: "2026-08-03",
        status: "SUBMITTED",
        deliverable: submittedByLeader(
          "Forecast module deliverable",
          "Notebook and short methodology memo.",
          "2026-07-27T09:00:00.000Z"
        ),
        reviews: [],
      },
      {
        key: "ms-4",
        title: "Dashboard build",
        description: "Deployed dashboard link.",
        deadline: "2026-08-24",
        status: "IN_PROGRESS",
        reviews: [],
      },
      {
        key: "ms-5",
        title: "Handover pack and walkthrough",
        description: "Runbook, recorded walkthrough, final presentation.",
        deadline: "2026-09-11",
        status: "PENDING",
        reviews: [],
      },
    ],
    resources: [
      restrictedResource(
        "Inbound shipment extract (18 months)",
        "Restricted dataset metadata only. The actual file would live in object storage.",
        "DATASET",
        "demo/projects/app-supply/inbound-shipment-extract",
        "user:contact-org-bencang",
        "2026-06-22T09:00:00.000Z"
      ),
      teamResource(
        "Warehouse taxonomy reference",
        "Team document reference for warehouse terminology and category definitions.",
        "DOCUMENT",
        "demo/projects/app-supply/warehouse-taxonomy-reference",
        "user:contact-org-bencang",
        "2026-06-22T09:30:00.000Z"
      ),
      restrictedResource(
        "Partner staging database",
        "Restricted access-reference metadata only. No hostnames, usernames, passwords, or tokens are stored.",
        "ACCESS_REFERENCE",
        null,
        "user:contact-org-bencang",
        "2026-06-22T10:00:00.000Z"
      ),
      teamResource(
        "Brand and reporting guidelines",
        "Team document reference for partner reporting conventions.",
        "DOCUMENT",
        "demo/projects/app-supply/brand-reporting-guidelines",
        "user:contact-org-bencang",
        "2026-06-22T10:30:00.000Z"
      ),
    ],
  },
  {
    key: "project:app-energy",
    sourceFixtureId: "app-energy",
    applicationKey: "application:app-energy",
    publicId: "55555555-5555-4555-8555-000000000002",
    facultySupervisorUserKey: "user:fac-vu",
    status: "FINAL_REVIEW",
    startDate: "2026-04-13",
    endDate: null,
    updatedAt: atUtc("2026-07-18T12:00:00.000Z"),
    milestones: [
      {
        key: "ms-e1",
        title: "Baseline consumption survey",
        description: "Survey dataset and methodology note.",
        deadline: "2026-05-08",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Baseline consumption survey deliverable",
          "Survey dataset and methodology note.",
          "2026-05-08T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-vu",
            "2026-05-09T09:00:00.000Z",
            "Faculty approved the baseline survey."
          ),
          partnerReview(
            "user:contact-org-facilities",
            "org:demo-facilities",
            "2026-05-09T10:00:00.000Z",
            "Facilities approved the baseline survey."
          ),
        ],
      },
      {
        key: "ms-e2",
        title: "Building-level breakdown",
        description: "Per-building consumption analysis.",
        deadline: "2026-06-12",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Building-level breakdown deliverable",
          "Per-building consumption analysis.",
          "2026-06-12T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-vu",
            "2026-06-13T09:00:00.000Z",
            "Faculty approved the building-level analysis."
          ),
          partnerReview(
            "user:contact-org-facilities",
            "org:demo-facilities",
            "2026-06-13T10:00:00.000Z",
            "Facilities approved the building-level analysis."
          ),
        ],
      },
      {
        key: "ms-e3",
        title: "Retrofit recommendations",
        description: "Final report with costed recommendations.",
        deadline: "2026-07-17",
        status: "SUBMITTED",
        deliverable: submittedByLeader(
          "Retrofit recommendations deliverable",
          "Final report with costed recommendations.",
          "2026-07-17T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-vu",
            "2026-07-18T09:00:00.000Z",
            "Faculty approved the final report; Facilities review remains pending."
          ),
        ],
      },
    ],
    resources: [
      teamResource(
        "Campus meter readings 2024-2026",
        "Team dataset reference for campus meter readings. No agreement required.",
        "DATASET",
        "demo/projects/app-energy/campus-meter-readings",
        "user:contact-org-facilities",
        "2026-04-13T09:00:00.000Z"
      ),
      teamResource(
        "Facilities floor plans",
        "Team document reference for facilities floor-plan context. No agreement required.",
        "DOCUMENT",
        "demo/projects/app-energy/facilities-floor-plans",
        "user:contact-org-facilities",
        "2026-04-13T09:30:00.000Z"
      ),
    ],
  },
  {
    key: "project:app-archive",
    sourceFixtureId: "app-archive",
    applicationKey: "application:app-archive",
    publicId: "55555555-5555-4555-8555-000000000003",
    facultySupervisorUserKey: "user:fac-pham",
    status: "COMPLETED",
    startDate: "2026-01-12",
    endDate: "2026-05-29",
    updatedAt: atUtc("2026-05-29T12:00:00.000Z"),
    milestones: [
      {
        key: "ms-a1",
        title: "Collection survey and prioritisation",
        description: "Prioritised catalogue of holdings.",
        deadline: "2026-02-13",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Collection survey and prioritisation deliverable",
          "Prioritised catalogue of holdings.",
          "2026-02-13T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-pham",
            "2026-02-14T09:00:00.000Z",
            "Faculty approved the collection survey."
          ),
          partnerReview(
            "user:contact-org-heritage",
            "org:demo-heritage",
            "2026-02-14T10:00:00.000Z",
            "Archive approved the collection survey."
          ),
        ],
      },
      {
        key: "ms-a2",
        title: "Digitisation pipeline",
        description: "Scanning workflow and metadata schema.",
        deadline: "2026-04-03",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Digitisation pipeline deliverable",
          "Scanning workflow and metadata schema.",
          "2026-04-03T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-pham",
            "2026-04-04T09:00:00.000Z",
            "Faculty approved the digitisation pipeline."
          ),
          partnerReview(
            "user:contact-org-heritage",
            "org:demo-heritage",
            "2026-04-04T10:00:00.000Z",
            "Archive approved the digitisation pipeline."
          ),
        ],
      },
      {
        key: "ms-a3",
        title: "Searchable archive handover",
        description: "Deployed archive and maintenance runbook.",
        deadline: "2026-05-22",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Searchable archive handover deliverable",
          "Deployed archive and maintenance runbook.",
          "2026-05-22T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-pham",
            "2026-05-24T09:00:00.000Z",
            "Faculty approved the final archive handover."
          ),
          partnerReview(
            "user:contact-org-heritage",
            "org:demo-heritage",
            "2026-05-24T10:00:00.000Z",
            "Archive approved the final archive handover."
          ),
        ],
      },
    ],
    resources: [
      teamResource(
        "Scanned holdings index",
        "Team dataset reference for the scanned holdings index. No agreement required.",
        "DATASET",
        "demo/projects/app-archive/scanned-holdings-index",
        "user:contact-org-heritage",
        "2026-01-12T09:00:00.000Z"
      ),
      teamResource(
        "Metadata standard (Dublin Core profile)",
        "Team document reference for the archive metadata standard.",
        "DOCUMENT",
        "demo/projects/app-archive/dublin-core-profile",
        "user:contact-org-heritage",
        "2026-01-12T09:30:00.000Z"
      ),
    ],
  },
  {
    key: "project:papp-depot",
    sourceFixtureId: "papp-depot",
    applicationKey: "application:papp-depot",
    publicId: "55555555-5555-4555-8555-000000000004",
    facultySupervisorUserKey: "user:fac-nguyen-k",
    status: "ACTIVE",
    startDate: "2026-06-12",
    endDate: null,
    updatedAt: atUtc("2026-07-27T00:00:00.000Z"),
    milestones: [
      {
        key: "ms-depot-1",
        title: "Data audit & baseline",
        description: "Route dataset profiled and a baseline cost model agreed.",
        deadline: "2026-06-26",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Data audit & baseline deliverable",
          "Route dataset profiled and a baseline cost model agreed.",
          "2026-06-26T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-nguyen-k",
            "2026-06-27T09:00:00.000Z",
            "Faculty approved the depot baseline."
          ),
          partnerReview(
            "user:contact-org-bencang",
            "org:demo-bencang",
            "2026-06-27T10:00:00.000Z",
            "Partner approved the depot baseline."
          ),
        ],
      },
      {
        key: "ms-depot-2",
        title: "Solver prototype",
        description: "Working heuristic over the sample region.",
        deadline: "2026-07-17",
        status: "COMPLETED",
        deliverable: submittedByLeader(
          "Solver prototype deliverable",
          "Working heuristic over the sample region.",
          "2026-07-17T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-nguyen-k",
            "2026-07-18T09:00:00.000Z",
            "Faculty approved the solver prototype."
          ),
          partnerReview(
            "user:contact-org-bencang",
            "org:demo-bencang",
            "2026-07-18T10:00:00.000Z",
            "Partner approved the solver prototype."
          ),
        ],
      },
      {
        key: "ms-depot-3",
        title: "Full-network run",
        description: "Solver across all fourteen depots plus a cost delta memo.",
        deadline: "2026-07-26",
        status: "SUBMITTED",
        deliverable: submittedByLeader(
          "Full-network run deliverable",
          "Solver across all fourteen depots plus a cost delta memo.",
          "2026-07-26T09:00:00.000Z"
        ),
        reviews: [
          facultyApproval(
            "user:fac-nguyen-k",
            "2026-07-26T12:00:00.000Z",
            "Faculty approved the full-network run; partner approval remains pending."
          ),
        ],
      },
      {
        key: "ms-depot-4",
        title: "Handover & recommendations",
        description: "Final deck and rollout plan operations can act on.",
        deadline: "2026-08-21",
        status: "PENDING",
        reviews: [],
      },
    ],
    resources: [
      restrictedResource(
        "Depot network extract",
        "Restricted dataset metadata only. The actual extract would live in object storage.",
        "DATASET",
        "demo/projects/papp-depot/depot-network-extract",
        "user:contact-org-bencang",
        "2026-06-12T09:00:00.000Z"
      ),
      restrictedResource(
        "Routing API sandbox",
        "Restricted access-reference metadata only. No API keys, credentials, tokens, or host secrets are stored.",
        "ACCESS_REFERENCE",
        null,
        "user:contact-org-bencang",
        "2026-06-12T09:30:00.000Z"
      ),
    ],
  },
];

function projectCreatedAt(seed: ProjectSeed) {
  return atUtc(`${seed.startDate}T00:00:00.000Z`);
}

async function ensureProject(ctx: SeedContext, seed: ProjectSeed) {
  const applicationId = ctx.getId(seed.applicationKey);
  const facultySupervisorId = ctx.getId(seed.facultySupervisorUserKey);

  const [project] = await ctx.tx
    .insert(projects)
    .values({
      applicationId,
      createdAt: projectCreatedAt(seed),
      endDate: seed.endDate,
      facultySupervisorId,
      publicId: seed.publicId,
      startDate: seed.startDate,
      status: seed.status,
      updatedAt: seed.updatedAt,
    })
    .onConflictDoUpdate({
      target: projects.applicationId,
      set: {
        endDate: seed.endDate,
        facultySupervisorId,
        publicId: seed.publicId,
        startDate: seed.startDate,
        status: seed.status,
        updatedAt: seed.updatedAt,
      },
    })
    .returning({ id: projects.id });

  ctx.setId(seed.key, project.id);
  return project.id;
}

async function ensureProjectMembers(
  ctx: SeedContext,
  seed: ProjectSeed,
  projectId: bigint
) {
  const applicationId = ctx.getId(seed.applicationKey);
  const acceptedMembers = await ctx.tx
    .select({
      preferredRole: applicationMembers.preferredRole,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .where(
      and(
        eq(applicationMembers.applicationId, applicationId),
        eq(applicationMembers.status, "ACCEPTED")
      )
    );

  for (const member of acceptedMembers) {
    await ctx.tx
      .insert(projectMembers)
      .values({
        joinedAt: projectCreatedAt(seed),
        projectId,
        projectRole: member.preferredRole,
        studentId: member.studentId,
      })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.studentId],
        set: {
          joinedAt: projectCreatedAt(seed),
          projectRole: member.preferredRole,
        },
      });
  }
}

async function ensureMilestone(
  ctx: SeedContext,
  projectId: bigint,
  projectKey: string,
  seed: MilestoneSeed
) {
  const existing = await ctx.tx
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.projectId, projectId), eq(milestones.title, seed.title)))
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate milestone "${seed.title}" for ${projectKey}.`
    );
  }

  const values = {
    deadline: seed.deadline,
    description: seed.description,
    projectId,
    status: seed.status,
    title: seed.title,
    updatedAt: atUtc(`${seed.deadline}T12:00:00.000Z`),
  };

  const [milestone] = existing[0]
    ? await ctx.tx
        .update(milestones)
        .set(values)
        .where(eq(milestones.id, existing[0].id))
        .returning({ id: milestones.id })
    : await ctx.tx.insert(milestones).values(values).returning({ id: milestones.id });

  ctx.setId(`${projectKey}:milestone:${seed.key}`, milestone.id);
  return milestone.id;
}

async function ensureDeliverable(
  ctx: SeedContext,
  milestoneId: bigint,
  seed: DeliverableSeed
) {
  const submittedBy =
    seed.submittedByUserKey === "leader"
      ? await findProjectLeaderUserId(ctx, milestoneId)
      : ctx.getId(seed.submittedByUserKey);

  const existing = await ctx.tx
    .select({ id: deliverables.id })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.milestoneId, milestoneId),
        eq(deliverables.title, seed.title),
        eq(deliverables.submittedBy, submittedBy)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(`Refusing to seed duplicate deliverable "${seed.title}".`);
  }

  const values = {
    description: seed.description,
    deliverableType: seed.type,
    externalUrl: null,
    fileUrl: null,
    milestoneId,
    submittedAt: seed.submittedAt,
    submittedBy,
    title: seed.title,
  };

  if (existing[0]) {
    await ctx.tx
      .update(deliverables)
      .set(values)
      .where(eq(deliverables.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(deliverables).values(values);
}

async function findProjectLeaderUserId(ctx: SeedContext, milestoneId: bigint) {
  const rows = await ctx.tx
    .select({ studentId: applicationMembers.studentId })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, projects.applicationId),
        eq(applicationMembers.memberRole, "LEADER"),
        eq(applicationMembers.status, "ACCEPTED")
      )
    )
    .where(eq(milestones.id, milestoneId))
    .limit(2);

  if (rows.length !== 1) {
    throw new Error("Refusing to seed deliverable: expected one accepted leader.");
  }

  return rows[0].studentId;
}

async function ensureMilestoneReview(
  ctx: SeedContext,
  milestoneId: bigint,
  seed: ReviewSeed
) {
  const reviewerId = ctx.getId(seed.reviewerUserKey);
  const reviewerOrganizationId = seed.reviewerOrganizationKey
    ? ctx.getId(seed.reviewerOrganizationKey)
    : null;

  const existing = await ctx.tx
    .select({ id: milestoneReviews.id })
    .from(milestoneReviews)
    .where(
      and(
        eq(milestoneReviews.milestoneId, milestoneId),
        eq(milestoneReviews.reviewerId, reviewerId),
        eq(milestoneReviews.reviewerRole, seed.reviewerRole),
        eq(milestoneReviews.createdAt, seed.createdAt)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error("Refusing to seed duplicate milestone review.");
  }

  const values = {
    comments: seed.comments,
    createdAt: seed.createdAt,
    decision: seed.decision,
    milestoneId,
    reviewerId,
    reviewerOrganizationId,
    reviewerRole: seed.reviewerRole,
    updatedAt: seed.createdAt,
  };

  if (existing[0]) {
    await ctx.tx
      .update(milestoneReviews)
      .set(values)
      .where(eq(milestoneReviews.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(milestoneReviews).values(values);
}

async function ensureProjectResource(
  ctx: SeedContext,
  projectId: bigint,
  seed: ResourceSeed
) {
  const existing = await ctx.tx
    .select({ id: projectResources.id })
    .from(projectResources)
    .where(
      and(
        eq(projectResources.projectId, projectId),
        eq(projectResources.title, seed.title)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(`Refusing to seed duplicate resource "${seed.title}".`);
  }

  const values = {
    createdAt: seed.createdAt,
    createdBy: ctx.getId(seed.createdByUserKey),
    description: seed.description,
    externalUrl: null,
    projectId,
    requiresAgreement: seed.requiresAgreement,
    resourceType: seed.resourceType,
    sensitivityLevel: seed.sensitivity,
    storageKey: seed.storageKey,
    title: seed.title,
    updatedAt: seed.createdAt,
  };

  if (existing[0]) {
    await ctx.tx
      .update(projectResources)
      .set(values)
      .where(eq(projectResources.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(projectResources).values(values);
}

async function validateDemoProjects(ctx: SeedContext) {
  const projectIds = DEMO_PROJECTS.map((seed) => ctx.getId(seed.key));
  const applicationIds = DEMO_PROJECTS.map((seed) => ctx.getId(seed.applicationKey));

  const duplicateProjects = await ctx.tx.execute(sql`
    select application_id
    from projects
    group by application_id
    having count(*) > 1
  `);

  if (duplicateProjects.rows.length > 0) {
    throw new Error("Seed validation failed: duplicate projects per application.");
  }

  const projectsWithoutAcceptedOffer = await ctx.tx
    .select({ id: projects.id })
    .from(projects)
    .leftJoin(selections, eq(selections.applicationId, projects.applicationId))
    .leftJoin(offers, eq(offers.selectionId, selections.id))
    .where(
      and(
        inArray(projects.id, projectIds),
        sql`(${offers.id} is null or ${offers.status} <> 'ACCEPTED')`
      )
    );

  if (projectsWithoutAcceptedOffer.length > 0) {
    throw new Error(
      "Seed validation failed: every project must originate from an accepted offer."
    );
  }

  const routeProject = await ctx.tx
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.applicationId, ctx.getId("application:app-route")));

  if (routeProject.length > 0) {
    throw new Error("Seed validation failed: app-route must not receive a project.");
  }

  const invalidProjectMembers = await ctx.tx
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .leftJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, projects.applicationId),
        eq(applicationMembers.studentId, projectMembers.studentId),
        eq(applicationMembers.status, "ACCEPTED")
      )
    )
    .where(and(inArray(projects.id, projectIds), isNull(applicationMembers.id)));

  if (invalidProjectMembers.length > 0) {
    throw new Error(
      "Seed validation failed: project members must come from accepted application members."
    );
  }

  const invitedProjectMembers = await ctx.tx
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, projects.applicationId),
        eq(applicationMembers.studentId, projectMembers.studentId),
        eq(applicationMembers.status, "INVITED")
      )
    )
    .where(inArray(projects.id, projectIds));

  if (invitedProjectMembers.length > 0) {
    throw new Error(
      "Seed validation failed: invited application members must not become project members."
    );
  }

  const missingMembers = await ctx.tx.execute(sql`
    select p.id
    from projects p
    join application_members am
      on am.application_id = p.application_id
      and am.status = 'ACCEPTED'
    left join project_members pm
      on pm.project_id = p.id
      and pm.student_id = am.student_id
    where p.id in (${sql.join(projectIds, sql`,`)})
      and pm.id is null
  `);

  if (missingMembers.rows.length > 0) {
    throw new Error(
      "Seed validation failed: accepted application members must become project members."
    );
  }

  const badDates = await ctx.tx
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        inArray(projects.id, projectIds),
        sql`${projects.startDate} is not null and ${projects.endDate} is not null and ${projects.startDate} > ${projects.endDate}`
      )
    );

  if (badDates.length > 0) {
    throw new Error("Seed validation failed: project dates are incoherent.");
  }

  const badMilestoneDates = await ctx.tx
    .select({ id: milestones.id })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        inArray(projects.id, projectIds),
        sql`${projects.startDate} is not null and ${milestones.deadline} is not null and ${milestones.deadline} < ${projects.startDate}`
      )
    );

  if (badMilestoneDates.length > 0) {
    throw new Error(
      "Seed validation failed: milestone deadlines must be on or after project start."
    );
  }

  const completedMilestoneProblems = await ctx.tx.execute(sql`
    with latest_reviews as (
      select distinct on (mr.milestone_id, mr.reviewer_role)
        mr.milestone_id,
        mr.reviewer_role,
        mr.decision
      from milestone_reviews mr
      order by mr.milestone_id, mr.reviewer_role, mr.created_at desc, mr.id desc
    )
    select m.id
    from milestones m
    join projects p on p.id = m.project_id
    left join latest_reviews faculty
      on faculty.milestone_id = m.id
      and faculty.reviewer_role = 'FACULTY'
    left join latest_reviews partner
      on partner.milestone_id = m.id
      and partner.reviewer_role = 'PARTNER'
    where p.id in (${sql.join(projectIds, sql`,`)})
      and m.status = 'COMPLETED'
      and (
        faculty.decision is distinct from 'APPROVED'
        or partner.decision is distinct from 'APPROVED'
      )
  `);

  if (completedMilestoneProblems.rows.length > 0) {
    throw new Error(
      "Seed validation failed: completed milestones require latest faculty and partner approvals."
    );
  }

  const facultyReviewProblems = await ctx.tx
    .select({ id: milestoneReviews.id })
    .from(milestoneReviews)
    .innerJoin(milestones, eq(milestoneReviews.milestoneId, milestones.id))
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        inArray(projects.id, projectIds),
        eq(milestoneReviews.reviewerRole, "FACULTY"),
        sql`${milestoneReviews.reviewerId} <> ${projects.facultySupervisorId}`
      )
    );

  if (facultyReviewProblems.length > 0) {
    throw new Error(
      "Seed validation failed: faculty milestone reviews must be by the project supervisor."
    );
  }

  const partnerReviewProblems = await ctx.tx.execute(sql`
    select mr.id
    from milestone_reviews mr
    join milestones m on m.id = mr.milestone_id
    join projects p on p.id = m.project_id
    join applications a on a.id = p.application_id
    join challenges c on c.id = a.challenge_id
    where p.id in (${sql.join(projectIds, sql`,`)})
      and mr.reviewer_role = 'PARTNER'
      and mr.reviewer_organization_id is distinct from c.owner_organization_id
  `);

  if (partnerReviewProblems.rows.length > 0) {
    throw new Error(
      "Seed validation failed: partner reviews must map to the challenge owner organization."
    );
  }

  const restrictedResourceProblems = await ctx.tx.execute(sql`
    select pr.id
    from project_resources pr
    join projects p on p.id = pr.project_id
    join applications a on a.id = p.application_id
    join project_members pm on pm.project_id = p.id
    where p.id in (${sql.join(projectIds, sql`,`)})
      and pr.requires_agreement = true
      and not exists (
        select 1
        from agreements ag
        where ag.application_id = a.id
          and ag.challenge_id = a.challenge_id
          and ag.user_id = pm.student_id
          and ag.accepted_at is not null
          and ag.revoked_at is null
      )
  `);

  if (restrictedResourceProblems.rows.length > 0) {
    throw new Error(
      "Seed validation failed: agreement-gated resources require accepted member agreements."
    );
  }

  const unexpectedRestrictedResources = await ctx.tx
    .select({ id: projectResources.id })
    .from(projectResources)
    .innerJoin(projects, eq(projectResources.projectId, projects.id))
    .where(
      and(
        inArray(projects.applicationId, [
          ctx.getId("application:app-energy"),
          ctx.getId("application:app-archive"),
        ]),
        eq(projectResources.requiresAgreement, true)
      )
    );

  if (unexpectedRestrictedResources.length > 0) {
    throw new Error(
      "Seed validation failed: agreement-free projects must not seed agreement-gated resources."
    );
  }

  const secretLikeResources = await ctx.tx
    .select({ id: projectResources.id })
    .from(projectResources)
    .where(
      and(
        inArray(projectResources.projectId, projectIds),
        sql`concat_ws(' ', ${projectResources.storageKey}, ${projectResources.externalUrl}) ~* '(password|secret|token|rt_live)'`
      )
    );

  if (secretLikeResources.length > 0) {
    throw new Error(
      "Seed validation failed: resource metadata must not contain secrets or credentials."
    );
  }

  const deliverableSubmitterProblems = await ctx.tx
    .select({ id: deliverables.id })
    .from(deliverables)
    .innerJoin(milestones, eq(deliverables.milestoneId, milestones.id))
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .leftJoin(
      projectMembers,
      and(
        eq(projectMembers.projectId, projects.id),
        eq(projectMembers.studentId, deliverables.submittedBy)
      )
    )
    .where(and(inArray(projects.id, projectIds), isNull(projectMembers.id)));

  if (deliverableSubmitterProblems.length > 0) {
    throw new Error(
      "Seed validation failed: deliverable submitters must be project members."
    );
  }

  const feedbackCount = await ctx.tx.select({ id: feedback.id }).from(feedback);

  if (feedbackCount.length > 0) {
    throw new Error("Seed validation failed: Phase 3.8 intentionally seeds no feedback.");
  }

  const nonProjectApplications = [
    "application:app-route",
    "application:app-triage",
    "application:app-churn",
    "application:app-outreach",
  ].map((key) => ctx.getId(key));

  const unexpectedProjects = await ctx.tx
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.applicationId, nonProjectApplications));

  if (unexpectedProjects.length > 0) {
    throw new Error(
      "Seed validation failed: non-project compact applications must not have projects."
    );
  }

  if (applicationIds.length !== new Set(applicationIds.map(String)).size) {
    throw new Error("Seed validation failed: duplicate project application seeds.");
  }
}

export async function seedDemoProjects(ctx: SeedContext) {
  for (const seed of DEMO_PROJECTS) {
    const projectId = await ensureProject(ctx, seed);
    await ensureProjectMembers(ctx, seed, projectId);

    for (const milestone of seed.milestones) {
      const milestoneId = await ensureMilestone(ctx, projectId, seed.key, milestone);

      if (milestone.deliverable) {
        await ensureDeliverable(ctx, milestoneId, milestone.deliverable);
      }

      for (const review of milestone.reviews) {
        await ensureMilestoneReview(ctx, milestoneId, review);
      }
    }

    for (const resource of seed.resources) {
      await ensureProjectResource(ctx, projectId, resource);
    }
  }

  await validateDemoProjects(ctx);

  ctx.record("DEMO", "projects", DEMO_PROJECTS.length);
  ctx.record(
    "DEMO",
    "project members",
    DEMO_PROJECTS.reduce((total, seed) => {
      const acceptedMemberCounts: Record<string, number> = {
        "application:app-supply": 3,
        "application:app-energy": 2,
        "application:app-archive": 3,
        "application:papp-depot": 2,
      };

      return total + acceptedMemberCounts[seed.applicationKey];
    }, 0)
  );
  ctx.record(
    "DEMO",
    "milestones",
    DEMO_PROJECTS.reduce((total, seed) => total + seed.milestones.length, 0)
  );
  ctx.record(
    "DEMO",
    "deliverables",
    DEMO_PROJECTS.reduce(
      (total, seed) =>
        total + seed.milestones.filter((milestone) => milestone.deliverable).length,
      0
    )
  );
  ctx.record(
    "DEMO",
    "milestone reviews",
    DEMO_PROJECTS.reduce(
      (total, seed) =>
        total +
        seed.milestones.reduce(
          (milestoneTotal, milestone) => milestoneTotal + milestone.reviews.length,
          0
        ),
      0
    )
  );
  ctx.record(
    "DEMO",
    "project resources",
    DEMO_PROJECTS.reduce((total, seed) => total + seed.resources.length, 0)
  );
  ctx.record("DEMO", "feedback", 0);
}
