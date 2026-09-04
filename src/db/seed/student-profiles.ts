import { and, eq } from "drizzle-orm";

import {
  studentCourses,
  studentPreferredRoles,
  studentProfiles,
  studentProjects,
} from "@/db/schema";
import type { SeedContext } from "./context";

/**
 * The part of a student record the profile, the apply wizard and the partner
 * directory render but the original DEMO seed never carried: a transcript,
 * a weekly shape, default team roles, and prior experience.
 *
 * Jordan Lee is the protagonist and gets the full record. Everyone else gets
 * enough to be a credible teammate — availability so `sharedFreeDays()` has
 * something to intersect, roles so `rolesCovered()` can report a gap, and a
 * couple of courses so a partner card is not empty. Nobody but Jordan needs a
 * complete transcript.
 */

type Availability = "FREE" | "PARTLY" | "BUSY";

type TeamRoleValue =
  | "DATA_ML"
  | "BACKEND"
  | "FRONTEND"
  | "ANALYSIS"
  | "RESEARCH"
  | "DESIGN"
  | "DOMAIN_EXPERT"
  | "COORDINATION";

interface CourseSeed {
  code: string;
  credits: number | null;
  /** Null marks a self-added row, which a CHECK constraint also enforces. */
  grade: string | null;
  /** The student chose to show this one to partners. */
  pinned?: boolean;
  source: "REGISTRAR" | "SELF";
  term: string;
  title: string;
}

interface ExperienceSeed {
  description: string | null;
  kind:
    | "INTERNSHIP"
    | "RESEARCH"
    | "TEACHING"
    | "PART_TIME"
    | "VOLUNTEERING"
    | "OTHER";
  /** Month precision is all anyone fills in honestly. */
  endDate: string | null;
  organisation: string;
  role: string;
  startDate: string;
  title: string;
}

interface StudentProfileDetailSeed {
  about: string;
  courses: CourseSeed[];
  creditsEarned: number;
  experiences: ExperienceSeed[];
  preferredRoles: TeamRoleValue[];
  preferredTeamMax: number;
  preferredTeamMin: number;
  studentKey: string;
  transcriptUrl: string | null;
  /** Monday first. */
  weeklyAvailability: Availability[];
  workPreference: "ON_SITE" | "HYBRID" | "REMOTE";
}

export const DEMO_STUDENT_PROFILE_DETAILS: StudentProfileDetailSeed[] = [
  {
    studentKey: "user:stu-jordan-lee",
    about:
      "Third-year computer engineering student working on applied ML and data pipelines. Looking for project work where the modelling has to survive contact with messy operational data.",
    creditsEarned: 78,
    transcriptUrl: "/transcripts/stu-jordan-lee.pdf",
    workPreference: "HYBRID",
    preferredTeamMin: 3,
    preferredTeamMax: 4,
    preferredRoles: ["DATA_ML", "BACKEND", "ANALYSIS"],
    // Tuesday and Sunday are the busy ones.
    weeklyAvailability: ["FREE", "BUSY", "FREE", "PARTLY", "FREE", "FREE", "BUSY"],
    courses: [
      { code: "CS3040", title: "Machine Learning", term: "Fall 2025", credits: 3, grade: "A", source: "REGISTRAR", pinned: true },
      { code: "CS3220", title: "Computer Vision", term: "Fall 2025", credits: 3, grade: "A−", source: "REGISTRAR" },
      { code: "CS3110", title: "Database Systems", term: "Fall 2025", credits: 3, grade: "A−", source: "REGISTRAR" },
      { code: "CS2100", title: "Data Structures & Algorithms", term: "Spring 2025", credits: 4, grade: "A", source: "REGISTRAR", pinned: true },
      { code: "MA2030", title: "Probability & Statistics", term: "Spring 2025", credits: 3, grade: "B+", source: "REGISTRAR" },
      { code: "EE2010", title: "Signals and Systems", term: "Spring 2025", credits: 3, grade: "B+", source: "REGISTRAR" },
      // The one unverified row, so the self-reported treatment is reachable.
      { code: "Coursera", title: "Deep Learning Specialisation", term: "2025", credits: null, grade: null, source: "SELF" },
    ],
    experiences: [
      {
        kind: "INTERNSHIP",
        title: "Data analyst intern",
        role: "Data analyst intern",
        organisation: "Fintech scale-up, Hanoi",
        startDate: "2025-06-01",
        endDate: "2025-08-31",
        description:
          "Built churn dashboards over transaction data; shipped a retention model that the growth team still runs weekly.",
      },
      {
        kind: "TEACHING",
        title: "Teaching assistant — CS2100",
        role: "Teaching assistant",
        organisation: "VinUni CECS",
        startDate: "2025-09-01",
        endDate: null,
        description: null,
      },
    ],
  },
  {
    studentKey: "user:stu-priya-raman",
    about: "Data science student interested in operations research and forecasting.",
    creditsEarned: 71,
    transcriptUrl: null,
    workPreference: "HYBRID",
    preferredTeamMin: 3,
    preferredTeamMax: 5,
    preferredRoles: ["DATA_ML", "ANALYSIS"],
    weeklyAvailability: ["FREE", "FREE", "PARTLY", "FREE", "BUSY", "PARTLY", "BUSY"],
    courses: [
      { code: "CS3040", title: "Machine Learning", term: "Fall 2025", credits: 3, grade: "A−", source: "REGISTRAR", pinned: true },
      { code: "MA3010", title: "Optimisation", term: "Fall 2025", credits: 3, grade: "A", source: "REGISTRAR", pinned: true },
    ],
    experiences: [
      {
        kind: "RESEARCH",
        title: "Research assistant — demand forecasting",
        role: "Research assistant",
        organisation: "VinUni CECS",
        startDate: "2025-02-01",
        endDate: "2025-07-31",
        description: "Time-series forecasting over campus dining demand.",
      },
    ],
  },
  {
    studentKey: "user:stu-minh-anh",
    about: "Business analytics student who likes turning operational messes into dashboards.",
    creditsEarned: 64,
    transcriptUrl: null,
    workPreference: "ON_SITE",
    preferredTeamMin: 2,
    preferredTeamMax: 4,
    preferredRoles: ["ANALYSIS", "COORDINATION"],
    weeklyAvailability: ["PARTLY", "FREE", "FREE", "BUSY", "FREE", "FREE", "BUSY"],
    courses: [
      { code: "BA2200", title: "Business Analytics", term: "Spring 2025", credits: 3, grade: "A−", source: "REGISTRAR", pinned: true },
    ],
    experiences: [],
  },
  {
    studentKey: "user:stu-hoang-tran",
    about: "Public health student with a side interest in data collection design.",
    creditsEarned: 82,
    transcriptUrl: null,
    workPreference: "ON_SITE",
    preferredTeamMin: 3,
    preferredTeamMax: 5,
    preferredRoles: ["RESEARCH", "DOMAIN_EXPERT"],
    weeklyAvailability: ["BUSY", "FREE", "FREE", "FREE", "PARTLY", "BUSY", "BUSY"],
    courses: [
      { code: "PH3100", title: "Epidemiology", term: "Fall 2025", credits: 3, grade: "A", source: "REGISTRAR", pinned: true },
    ],
    experiences: [
      {
        kind: "VOLUNTEERING",
        title: "Community health outreach volunteer",
        role: "Volunteer",
        organisation: "Hanoi community clinic",
        startDate: "2025-03-01",
        endDate: null,
        description: null,
      },
    ],
  },
  {
    studentKey: "user:stu-bao-tran",
    about: "Software engineering student, mostly backend and infrastructure.",
    creditsEarned: 90,
    transcriptUrl: null,
    workPreference: "REMOTE",
    preferredTeamMin: 2,
    preferredTeamMax: 4,
    preferredRoles: ["BACKEND", "COORDINATION"],
    weeklyAvailability: ["FREE", "PARTLY", "BUSY", "FREE", "FREE", "PARTLY", "FREE"],
    courses: [
      { code: "CS3110", title: "Database Systems", term: "Fall 2025", credits: 3, grade: "A", source: "REGISTRAR", pinned: true },
    ],
    experiences: [
      {
        kind: "PART_TIME",
        title: "Backend developer (part-time)",
        role: "Backend developer",
        organisation: "Local logistics startup",
        startDate: "2025-01-01",
        endDate: null,
        description: "Route planning services and the API around them.",
      },
    ],
  },
  {
    studentKey: "user:stu-linh-pham",
    about: "Design student working on interfaces for archives and cultural collections.",
    creditsEarned: 68,
    transcriptUrl: null,
    workPreference: "HYBRID",
    preferredTeamMin: 3,
    preferredTeamMax: 4,
    preferredRoles: ["DESIGN", "FRONTEND"],
    weeklyAvailability: ["FREE", "FREE", "BUSY", "PARTLY", "FREE", "BUSY", "FREE"],
    courses: [
      { code: "DS2400", title: "Interaction Design", term: "Spring 2025", credits: 3, grade: "A", source: "REGISTRAR", pinned: true },
    ],
    experiences: [],
  },
  {
    studentKey: "user:stu-thao-ha",
    about: "History student doing digital humanities work on archival metadata.",
    creditsEarned: 75,
    transcriptUrl: null,
    workPreference: "ON_SITE",
    preferredTeamMin: 2,
    preferredTeamMax: 4,
    preferredRoles: ["RESEARCH", "ANALYSIS"],
    weeklyAvailability: ["PARTLY", "FREE", "FREE", "FREE", "BUSY", "FREE", "BUSY"],
    courses: [
      { code: "HI3200", title: "Digital Humanities", term: "Fall 2025", credits: 3, grade: "A−", source: "REGISTRAR", pinned: true },
    ],
    experiences: [],
  },
];

async function applyProfileDetail(
  ctx: SeedContext,
  seed: StudentProfileDetailSeed
) {
  const studentId = ctx.getId(seed.studentKey);

  await ctx.tx
    .update(studentProfiles)
    .set({
      about: seed.about,
      creditsEarned: seed.creditsEarned,
      preferredTeamMax: seed.preferredTeamMax,
      preferredTeamMin: seed.preferredTeamMin,
      transcriptUrl: seed.transcriptUrl,
      updatedAt: new Date(),
      weeklyAvailability: seed.weeklyAvailability,
      workPreference: seed.workPreference,
    })
    .where(eq(studentProfiles.userId, studentId));
}

async function ensureCourse(
  ctx: SeedContext,
  studentId: bigint,
  seed: CourseSeed
) {
  const values = {
    code: seed.code,
    credits: seed.credits,
    grade: seed.grade,
    pinned: seed.pinned ?? false,
    source: seed.source,
    studentId,
    term: seed.term,
    title: seed.title,
    updatedAt: new Date(),
  };

  const existing = await ctx.tx
    .select({ id: studentCourses.id })
    .from(studentCourses)
    .where(
      and(
        eq(studentCourses.studentId, studentId),
        eq(studentCourses.code, seed.code),
        eq(studentCourses.term, seed.term)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(`Refusing to seed duplicate course "${seed.code}".`);
  }

  if (existing[0]) {
    await ctx.tx
      .update(studentCourses)
      .set(values)
      .where(eq(studentCourses.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(studentCourses).values(values);
}

async function ensurePreferredRoles(
  ctx: SeedContext,
  studentId: bigint,
  roles: TeamRoleValue[]
) {
  for (const role of roles) {
    await ctx.tx
      .insert(studentPreferredRoles)
      .values({ role, studentId })
      .onConflictDoNothing();
  }
}

async function ensureExperience(
  ctx: SeedContext,
  studentId: bigint,
  seed: ExperienceSeed
) {
  const values = {
    description: seed.description,
    endDate: seed.endDate,
    kind: seed.kind,
    organisation: seed.organisation,
    roleDescription: seed.role,
    startDate: seed.startDate,
    studentId,
    title: seed.title,
    updatedAt: new Date(),
  };

  const existing = await ctx.tx
    .select({ id: studentProjects.id })
    .from(studentProjects)
    .where(
      and(
        eq(studentProjects.studentId, studentId),
        eq(studentProjects.title, seed.title)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(`Refusing to seed duplicate experience "${seed.title}".`);
  }

  if (existing[0]) {
    await ctx.tx
      .update(studentProjects)
      .set(values)
      .where(eq(studentProjects.id, existing[0].id));
    return;
  }

  await ctx.tx.insert(studentProjects).values(values);
}

export async function seedDemoStudentProfileDetails(ctx: SeedContext) {
  let courseCount = 0;
  let roleCount = 0;
  let experienceCount = 0;

  for (const seed of DEMO_STUDENT_PROFILE_DETAILS) {
    const studentId = ctx.getId(seed.studentKey);

    await applyProfileDetail(ctx, seed);
    await ensurePreferredRoles(ctx, studentId, seed.preferredRoles);
    roleCount += seed.preferredRoles.length;

    for (const course of seed.courses) {
      await ensureCourse(ctx, studentId, course);
      courseCount += 1;
    }

    for (const experience of seed.experiences) {
      await ensureExperience(ctx, studentId, experience);
      experienceCount += 1;
    }
  }

  ctx.record("DEMO", "student courses", courseCount);
  ctx.record("DEMO", "student preferred roles", roleCount);
  ctx.record("DEMO", "student experiences", experienceCount);
}
