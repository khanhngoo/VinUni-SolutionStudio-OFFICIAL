import { and, eq } from "drizzle-orm";

import {
  challengeEligibilityRules,
  challengeFacultyAssignments,
  challenges,
  challengeSkills,
} from "../schema";
import type { SeedContext } from "./context";
import { resolveCanonicalSkillSeedLabel } from "./skills";

type CompensationType = "PAID" | "UNPAID" | "CREDIT" | "OTHER" | "NOT_SPECIFIED";
type WorkMode = "ONSITE" | "HYBRID" | "REMOTE";
type ChallengeVisibility = "PUBLIC_PREVIEW" | "VINUNI_ONLY" | "INVITE_ONLY" | "PRIVATE";
type ChallengeStatus = "APPLICATIONS_OPEN";
type SkillRequirementType = "REQUIRED" | "PREFERRED" | "OPTIONAL";
type EligibilityRuleType = "MIN_GPA" | "STUDY_YEAR" | "SCHOOL";

interface DemoChallengeSkillSeed {
  name: string;
  requirementType: SkillRequirementType;
}

interface DemoChallengeEligibilityRuleSeed {
  config: Record<string, unknown>;
  required: boolean;
  ruleType: EligibilityRuleType;
}

interface DemoChallengeSeed {
  applicationDeadline: Date;
  compensationDescription: string | null;
  compensationType: CompensationType;
  confidentialityLevel: string;
  contactUserKey: string;
  description: string;
  domain: string;
  durationWeeks: number;
  eligibilityRules: DemoChallengeEligibilityRuleSeed[];
  expectedDeliverables: string;
  facultyAssignments: string[];
  managingOrganizationKey: string;
  ownerOrganizationKey: string;
  publicId: string;
  skills: DemoChallengeSkillSeed[];
  slug: string;
  sourceFixtureId: string;
  startDate: string;
  status: ChallengeStatus;
  subtype: string;
  summary: string;
  teamSizeMax: number;
  teamSizeMin: number;
  title: string;
  visibility: ChallengeVisibility;
  weeklyHours: number;
  workMode: WorkMode;
}

function deliverables(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function deadlineAtVietnamEndOfDay(date: string) {
  return new Date(`${date}T16:59:00.000Z`);
}

function requiredSkill(name: string): DemoChallengeSkillSeed {
  return { name, requirementType: "REQUIRED" };
}

function preferredSkill(name: string): DemoChallengeSkillSeed {
  return { name, requirementType: "PREFERRED" };
}

function schoolRule(values: string[]): DemoChallengeEligibilityRuleSeed {
  return {
    ruleType: "SCHOOL",
    required: true,
    config: { schools: values },
  };
}

function studyYearRule(values: number[]): DemoChallengeEligibilityRuleSeed {
  return {
    ruleType: "STUDY_YEAR",
    required: true,
    config: { studyYears: values },
  };
}

function minGpaRule(value: number): DemoChallengeEligibilityRuleSeed {
  return {
    ruleType: "MIN_GPA",
    required: true,
    config: { minGpa: value, scale: 4 },
  };
}

export const DEMO_CHALLENGES: DemoChallengeSeed[] = [
  {
    sourceFixtureId: "merchant-churn-model",
    slug: "merchant-churn-model",
    publicId: "33333333-3333-4333-8333-000000000001",
    title: "Merchant churn analysis and retention model",
    ownerOrganizationKey: "org:demo-bencang",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-bencang",
    summary:
      "The partner is losing small merchants in their first ninety days and cannot yet tell churn risk from ordinary seasonality. You will work with their data team to build a first retention model and a short set of operating recommendations.",
    description:
      "The partner is losing small merchants in their first ninety days and cannot yet tell churn risk from ordinary seasonality. You will work with their data team to build a first retention model and a short set of operating recommendations.",
    subtype: "Mini-Internship",
    domain: "Analytics, Retention",
    expectedDeliverables: deliverables([
      "Clean and join the merchant activity dataset the partner provides",
      "Build a baseline churn model and document its assumptions",
      "Translate model output into three concrete retention actions",
    ]),
    durationWeeks: 8,
    weeklyHours: 8,
    teamSizeMin: 2,
    teamSizeMax: 3,
    workMode: "HYBRID",
    startDate: "2026-09-01",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-18"),
    compensationType: "PAID",
    compensationDescription: null,
    visibility: "PRIVATE",
    confidentialityLevel: "HIGH_CONFIDENTIALITY",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Python"),
      requiredSkill("Data analysis"),
      requiredSkill("SQL"),
      preferredSkill("Business modelling"),
    ],
    eligibilityRules: [
      studyYearRule([2, 3, 4]),
      schoolRule(["CBM", "CECS"]),
    ],
    facultyAssignments: ["user:fac-osei", "user:fac-pham"],
  },
  {
    sourceFixtureId: "route-optimisation",
    slug: "route-optimisation",
    publicId: "33333333-3333-4333-8333-000000000002",
    title: "Route optimisation prototype for last-mile delivery",
    ownerOrganizationKey: "org:demo-bencang",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-bencang",
    summary:
      "Drivers currently plan their own routes and the depot has no way to compare one day against another. You will prototype a routing heuristic against real historical drop data and show what it would have saved.",
    description:
      "Drivers currently plan their own routes and the depot has no way to compare one day against another. You will prototype a routing heuristic against real historical drop data and show what it would have saved.",
    subtype: "Project",
    domain: "Optimisation, Operations",
    expectedDeliverables: deliverables([
      "Model the depot's constraints from historical delivery logs",
      "Implement and tune a routing heuristic",
      "Report the counterfactual saving over four sample weeks",
    ]),
    durationWeeks: 6,
    weeklyHours: 10,
    teamSizeMin: 2,
    teamSizeMax: 4,
    workMode: "REMOTE",
    startDate: "2026-09-07",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-25"),
    compensationType: "OTHER",
    compensationDescription: "Work-study",
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Python"),
      requiredSkill("Algorithms"),
      preferredSkill("Data analysis"),
      preferredSkill("Operations research"),
    ],
    eligibilityRules: [studyYearRule([2, 3, 4]), schoolRule(["CECS"])],
    facultyAssignments: ["user:fac-pham", "user:fac-nguyen-k"],
  },
  {
    sourceFixtureId: "triage-protocol-review",
    slug: "triage-protocol-review",
    publicId: "33333333-3333-4333-8333-000000000003",
    title: "Emergency triage protocol review",
    ownerOrganizationKey: "org:demo-health",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-health",
    summary:
      "The department is revising its triage protocol and needs the current evidence base assembled and appraised before the clinical committee meets. You will do that review under supervision.",
    description:
      "The department is revising its triage protocol and needs the current evidence base assembled and appraised before the clinical committee meets. You will do that review under supervision.",
    subtype: "Research Internship",
    domain: "Clinical research, Public health",
    expectedDeliverables: deliverables([
      "Run a structured literature search across three databases",
      "Appraise and summarise the twenty strongest papers",
      "Draft the evidence section of the committee submission",
    ]),
    durationWeeks: 12,
    weeklyHours: 10,
    teamSizeMin: 1,
    teamSizeMax: 2,
    workMode: "ONSITE",
    startDate: "2026-09-14",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-30"),
    compensationType: "CREDIT",
    compensationDescription: null,
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Literature review"),
      requiredSkill("Clinical reasoning"),
      preferredSkill("Statistics"),
    ],
    eligibilityRules: [studyYearRule([3, 4]), schoolRule(["CHS"])],
    facultyAssignments: ["user:fac-vu"],
  },
  {
    sourceFixtureId: "community-health-outreach",
    slug: "community-health-outreach",
    publicId: "33333333-3333-4333-8333-000000000004",
    title: "Community health outreach measurement",
    ownerOrganizationKey: "org:demo-vhf",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-vhf",
    summary:
      "The foundation runs six outreach programmes and can only guess which ones work. You will design the measurement framework and pilot it on two of them.",
    description:
      "The foundation runs six outreach programmes and can only guess which ones work. You will design the measurement framework and pilot it on two of them.",
    subtype: "Mini-Internship",
    domain: "Public health, Programme evaluation",
    expectedDeliverables: deliverables([
      "Define outcome measures with programme staff",
      "Pilot data collection across two sites",
      "Report findings and a rollout plan for the rest",
    ]),
    durationWeeks: 8,
    weeklyHours: 8,
    teamSizeMin: 2,
    teamSizeMax: 3,
    workMode: "ONSITE",
    startDate: "2026-08-31",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-15"),
    compensationType: "PAID",
    compensationDescription: null,
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Programme evaluation"),
      requiredSkill("Statistics"),
      preferredSkill("Fieldwork"),
    ],
    eligibilityRules: [studyYearRule([2, 3, 4]), schoolRule(["CHS"])],
    facultyAssignments: ["user:fac-vu", "user:fac-le"],
  },
  {
    sourceFixtureId: "supply-chain-dashboard",
    slug: "supply-chain-dashboard",
    publicId: "33333333-3333-4333-8333-000000000005",
    title: "Supply chain visibility dashboard",
    ownerOrganizationKey: "org:demo-bencang",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-bencang",
    summary:
      "Three teams track the same shipments in three spreadsheets and none of them agree. You will build the single dashboard that replaces all three, working with each team to settle what the numbers mean.",
    description:
      "Three teams track the same shipments in three spreadsheets and none of them agree. You will build the single dashboard that replaces all three, working with each team to settle what the numbers mean.",
    subtype: "Project",
    domain: "Data visualisation, Supply chain",
    expectedDeliverables: deliverables([
      "Reconcile the three existing spreadsheet definitions",
      "Build the dashboard against their live data export",
      "Run a handover session with each team",
    ]),
    durationWeeks: 8,
    weeklyHours: 10,
    teamSizeMin: 2,
    teamSizeMax: 4,
    workMode: "HYBRID",
    startDate: "2026-09-07",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-22"),
    compensationType: "PAID",
    compensationDescription: null,
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("SQL"),
      requiredSkill("Data visualisation"),
      preferredSkill("Stakeholder interviews"),
    ],
    eligibilityRules: [
      studyYearRule([2, 3, 4]),
      schoolRule(["CECS", "CBM"]),
    ],
    facultyAssignments: ["user:fac-pham", "user:fac-osei"],
  },
  {
    sourceFixtureId: "campus-energy-audit",
    slug: "campus-energy-audit",
    publicId: "33333333-3333-4333-8333-000000000006",
    title: "Campus energy audit and reduction plan",
    ownerOrganizationKey: "org:demo-facilities",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-facilities",
    summary:
      "Facilities has meter data for every building but has never analysed it. You will find where the campus wastes energy and cost the three highest-value fixes.",
    description:
      "Facilities has meter data for every building but has never analysed it. You will find where the campus wastes energy and cost the three highest-value fixes.",
    subtype: "Project",
    domain: "Energy, Instrumentation",
    expectedDeliverables: deliverables([
      "Analyse twelve months of building meter data",
      "Identify the top waste sources with supporting evidence",
      "Cost three interventions with expected payback",
    ]),
    durationWeeks: 6,
    weeklyHours: 8,
    teamSizeMin: 2,
    teamSizeMax: 4,
    workMode: "ONSITE",
    startDate: "2026-08-10",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-07-30"),
    compensationType: "PAID",
    compensationDescription: null,
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Data analysis"),
      requiredSkill("Energy systems"),
      preferredSkill("Python"),
    ],
    eligibilityRules: [studyYearRule([2, 3, 4]), schoolRule(["CECS"])],
    facultyAssignments: ["user:fac-nguyen-k", "user:fac-le"],
  },
  {
    sourceFixtureId: "archive-digitisation",
    slug: "archive-digitisation",
    publicId: "33333333-3333-4333-8333-000000000007",
    title: "Cultural archive digitisation and metadata design",
    ownerOrganizationKey: "org:demo-heritage",
    managingOrganizationKey: "org:caid",
    contactUserKey: "user:contact-org-heritage",
    summary:
      "The archive is digitising a collection of mid-century periodicals and needs a metadata scheme that will still make sense in twenty years. You will design it and prove it on the first thousand items.",
    description:
      "The archive is digitising a collection of mid-century periodicals and needs a metadata scheme that will still make sense in twenty years. You will design it and prove it on the first thousand items.",
    subtype: "Mini-Internship",
    domain: "Digital humanities, Archives",
    expectedDeliverables: deliverables([
      "Design a metadata schema against archival standards",
      "Catalogue the first thousand digitised items",
      "Document the scheme for the archive's ongoing use",
    ]),
    durationWeeks: 10,
    weeklyHours: 8,
    teamSizeMin: 2,
    teamSizeMax: 3,
    workMode: "ONSITE",
    startDate: "2026-09-14",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-08-28"),
    compensationType: "OTHER",
    compensationDescription: "Work-study",
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "STANDARD",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Archival research"),
      requiredSkill("Metadata standards"),
      preferredSkill("Vietnamese"),
    ],
    eligibilityRules: [studyYearRule([4]), schoolRule(["CAS"])],
    facultyAssignments: ["user:fac-le", "user:fac-tran"],
  },
  {
    sourceFixtureId: "synthesized-demo-elab-venture-readiness-dashboard",
    slug: "demo-elab-venture-readiness-dashboard",
    publicId: "33333333-3333-4333-8333-000000000008",
    title: "SYNTHETIC DEMO: E-Lab venture readiness dashboard",
    ownerOrganizationKey: "org:elab",
    managingOrganizationKey: "org:elab",
    contactUserKey: "user:elab-admin-dev",
    summary:
      "Synthetic DEMO challenge for exercising E-Lab-owned and E-Lab-managed internal challenge flows without external partner data.",
    description:
      "Synthetic DEMO challenge for exercising E-Lab-owned and E-Lab-managed internal challenge flows without external partner data. Students define venture-readiness indicators, prototype a lightweight dashboard, and hand the demo back to E-Lab.",
    subtype: "Project",
    domain: "Entrepreneurship, Analytics",
    expectedDeliverables: deliverables([
      "Define venture-readiness indicators",
      "Build a lightweight dashboard prototype",
      "Present a demo handoff to E-Lab",
    ]),
    durationWeeks: 6,
    weeklyHours: 6,
    teamSizeMin: 2,
    teamSizeMax: 3,
    workMode: "HYBRID",
    startDate: "2026-09-15",
    applicationDeadline: deadlineAtVietnamEndOfDay("2026-09-05"),
    compensationType: "CREDIT",
    compensationDescription: "Synthetic DEMO credit-bearing internal E-Lab project.",
    visibility: "VINUNI_ONLY",
    confidentialityLevel: "DEMO_INTERNAL",
    status: "APPLICATIONS_OPEN",
    skills: [
      requiredSkill("Data analysis"),
      requiredSkill("Business modelling"),
      preferredSkill("Data visualisation"),
    ],
    eligibilityRules: [
      minGpaRule(3.5),
      studyYearRule([2, 3, 4]),
      schoolRule(["CBM", "CECS"]),
    ],
    facultyAssignments: ["user:fac-pham"],
  },
];

async function ensureDemoChallenge(ctx: SeedContext, seed: DemoChallengeSeed) {
  const [challenge] = await ctx.tx
    .insert(challenges)
    .values({
      applicationDeadline: seed.applicationDeadline,
      compensationDescription: seed.compensationDescription,
      compensationType: seed.compensationType,
      confidentialityLevel: seed.confidentialityLevel,
      contactPersonId: ctx.getId(seed.contactUserKey),
      description: seed.description,
      domain: seed.domain,
      durationWeeks: seed.durationWeeks,
      expectedDeliverables: seed.expectedDeliverables,
      managingOrganizationId: ctx.getId(seed.managingOrganizationKey),
      ownerOrganizationId: ctx.getId(seed.ownerOrganizationKey),
      publicId: seed.publicId,
      slug: seed.slug,
      startDate: seed.startDate,
      status: seed.status,
      subtype: seed.subtype,
      summary: seed.summary,
      teamSizeMax: seed.teamSizeMax,
      teamSizeMin: seed.teamSizeMin,
      title: seed.title,
      visibility: seed.visibility,
      weeklyHours: seed.weeklyHours,
      workMode: seed.workMode,
    })
    .onConflictDoUpdate({
      target: challenges.slug,
      set: {
        applicationDeadline: seed.applicationDeadline,
        compensationDescription: seed.compensationDescription,
        compensationType: seed.compensationType,
        confidentialityLevel: seed.confidentialityLevel,
        contactPersonId: ctx.getId(seed.contactUserKey),
        description: seed.description,
        domain: seed.domain,
        durationWeeks: seed.durationWeeks,
        expectedDeliverables: seed.expectedDeliverables,
        managingOrganizationId: ctx.getId(seed.managingOrganizationKey),
        ownerOrganizationId: ctx.getId(seed.ownerOrganizationKey),
        publicId: seed.publicId,
        startDate: seed.startDate,
        status: seed.status,
        subtype: seed.subtype,
        summary: seed.summary,
        teamSizeMax: seed.teamSizeMax,
        teamSizeMin: seed.teamSizeMin,
        title: seed.title,
        updatedAt: new Date(),
        visibility: seed.visibility,
        weeklyHours: seed.weeklyHours,
        workMode: seed.workMode,
      },
    })
    .returning({ id: challenges.id });

  ctx.setId(`challenge:${seed.slug}`, challenge.id);
  return challenge.id;
}

async function ensureDemoChallengeSkill(
  ctx: SeedContext,
  challengeId: bigint,
  seed: DemoChallengeSkillSeed
) {
  const { canonicalName } = resolveCanonicalSkillSeedLabel(seed.name);
  const skillId = ctx.getId(`skill:${canonicalName}`);

  const existing = await ctx.tx
    .select({ id: challengeSkills.id })
    .from(challengeSkills)
    .where(
      and(
        eq(challengeSkills.challengeId, challengeId),
        eq(challengeSkills.skillId, skillId)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate challenge skill "${seed.name}" for challenge ${challengeId}.`
    );
  }

  if (existing[0]) {
    await ctx.tx
      .update(challengeSkills)
      .set({
        normalizationStatus: "NORMALIZED",
        rawSkillName: seed.name,
        requirementType: seed.requirementType,
        weight: 1,
      })
      .where(eq(challengeSkills.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(challengeSkills).values({
    challengeId,
    normalizationStatus: "NORMALIZED",
    rawSkillName: seed.name,
    requirementType: seed.requirementType,
    skillId,
    weight: 1,
  });
}

async function ensureDemoEligibilityRule(
  ctx: SeedContext,
  challengeId: bigint,
  seed: DemoChallengeEligibilityRuleSeed
) {
  const existing = await ctx.tx
    .select({ id: challengeEligibilityRules.id })
    .from(challengeEligibilityRules)
    .where(
      and(
        eq(challengeEligibilityRules.challengeId, challengeId),
        eq(challengeEligibilityRules.ruleType, seed.ruleType)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate ${seed.ruleType} eligibility rules for challenge ${challengeId}.`
    );
  }

  if (existing[0]) {
    await ctx.tx
      .update(challengeEligibilityRules)
      .set({
        config: seed.config,
        required: seed.required,
        updatedAt: new Date(),
      })
      .where(eq(challengeEligibilityRules.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(challengeEligibilityRules).values({
    challengeId,
    config: seed.config,
    required: seed.required,
    ruleType: seed.ruleType,
  });
}

async function ensureDemoFacultyAssignment(
  ctx: SeedContext,
  challengeId: bigint,
  facultyUserKey: string,
  assignedByUserKey: string
) {
  const facultyId = ctx.getId(facultyUserKey);
  const existing = await ctx.tx
    .select({ id: challengeFacultyAssignments.id })
    .from(challengeFacultyAssignments)
    .where(
      and(
        eq(challengeFacultyAssignments.challengeId, challengeId),
        eq(challengeFacultyAssignments.facultyId, facultyId)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate faculty assignment ${facultyUserKey} for challenge ${challengeId}.`
    );
  }

  const assignedAt = new Date("2026-08-16T00:00:00.000Z");
  const comments = "DEMO challenge-side faculty routing suggestion.";

  if (existing[0]) {
    await ctx.tx
      .update(challengeFacultyAssignments)
      .set({
        assignedAt,
        assignedBy: ctx.getId(assignedByUserKey),
        comments,
        respondedAt: null,
        status: "PENDING",
      })
      .where(eq(challengeFacultyAssignments.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(challengeFacultyAssignments).values({
    assignedAt,
    assignedBy: ctx.getId(assignedByUserKey),
    challengeId,
    comments,
    facultyId,
    status: "PENDING",
  });
}

export async function seedDemoChallenges(ctx: SeedContext) {
  for (const seed of DEMO_CHALLENGES) {
    const challengeId = await ensureDemoChallenge(ctx, seed);
    const assignedByUserKey =
      seed.managingOrganizationKey === "org:elab"
        ? "user:elab-admin-dev"
        : "user:caid-admin-dev";

    for (const skill of seed.skills) {
      await ensureDemoChallengeSkill(ctx, challengeId, skill);
    }

    for (const rule of seed.eligibilityRules) {
      await ensureDemoEligibilityRule(ctx, challengeId, rule);
    }

    for (const facultyUserKey of seed.facultyAssignments) {
      await ensureDemoFacultyAssignment(
        ctx,
        challengeId,
        facultyUserKey,
        assignedByUserKey
      );
    }
  }

  ctx.record("DEMO", "challenges", DEMO_CHALLENGES.length);
  ctx.record(
    "DEMO",
    "challenge skills",
    DEMO_CHALLENGES.reduce((total, seed) => total + seed.skills.length, 0)
  );
  ctx.record(
    "DEMO",
    "challenge eligibility rules",
    DEMO_CHALLENGES.reduce((total, seed) => total + seed.eligibilityRules.length, 0)
  );
  ctx.record(
    "DEMO",
    "challenge faculty assignments",
    DEMO_CHALLENGES.reduce(
      (total, seed) => total + seed.facultyAssignments.length,
      0
    )
  );
  ctx.record("DEMO", "challenge reviews", 0);
}
