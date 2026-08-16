import { and, eq } from "drizzle-orm";

import {
  facultyProfiles,
  organizationMemberships,
  organizations,
  studentProfiles,
  studentSkills,
  users,
} from "../schema";
import type { SeedContext } from "./context";
import { normalizeSkillLookup, SKILL_ALIASES, SKILL_SEEDS } from "./skills";

type OrganizationType = "INTERNAL_UNIT" | "EXTERNAL_PARTNER";
type StudentSchool = "CAS" | "CBM" | "CECS" | "CHS";

interface DemoOrganizationSeed {
  classificationConfidence: string;
  description: string;
  industry: string;
  key: string;
  name: string;
  organizationType: OrganizationType;
  sourceFixtureId: string;
  supports: string[];
}

interface DemoContactSeed {
  email: string;
  fullName: string;
  jobTitle: string;
  key: string;
  organizationKey: string;
  sourceFixtureId: string;
}

interface DemoStudentSeed {
  about: string | null;
  availableHoursPerWeek: number;
  email: string;
  fullName: string;
  gpa?: number;
  gpaScale?: number;
  key: string;
  major: string;
  school: StudentSchool;
  skills: string[];
  sourceFixtureId: string;
  studyYear: number;
}

interface DemoFacultySeed {
  academicTitle: string;
  department: string;
  email: string;
  fullName: string;
  key: string;
  maxActiveSupervisions: number;
  school: StudentSchool;
  sourceFixtureId: string;
}

export const DEMO_ORGANIZATIONS: DemoOrganizationSeed[] = [
  {
    key: "org:demo-bencang",
    sourceFixtureId: "org-bencang",
    name: "Bến Cảng Logistics",
    organizationType: "EXTERNAL_PARTNER",
    industry: "Logistics group, Hai Phong",
    classificationConfidence:
      "High: fixture describes a port and distribution operator/company partner.",
    description:
      "DEMO partner from static fixture org-bencang. Port and distribution operator running freight, warehousing, and last-mile delivery scenarios.",
    supports: [
      "route-optimisation",
      "merchant-churn-model",
      "supply-chain-dashboard",
      "app-route",
      "app-churn",
      "app-supply",
      "papp-depot",
    ],
  },
  {
    key: "org:demo-vhf",
    sourceFixtureId: "org-vhf",
    name: "Vietnam Health Foundation",
    organizationType: "EXTERNAL_PARTNER",
    industry: "Non-profit, Hanoi",
    classificationConfidence:
      "High: fixture describes a public-health non-profit external partner.",
    description:
      "DEMO partner from static fixture org-vhf. Public-health non-profit used for the supervision-request scenario.",
    supports: ["community-health-outreach", "app-outreach", "inv-outreach"],
  },
  {
    key: "org:demo-facilities",
    sourceFixtureId: "org-facilities",
    name: "VinUni Facilities",
    organizationType: "INTERNAL_UNIT",
    industry: "University department, Hanoi",
    classificationConfidence:
      "High: fixture explicitly identifies a VinUni university department.",
    description:
      "DEMO internal unit from static fixture org-facilities. Campus operations unit used for the final-review project scenario.",
    supports: ["campus-energy-audit", "app-energy"],
  },
  {
    key: "org:demo-heritage",
    sourceFixtureId: "org-heritage",
    name: "National Heritage Archive",
    organizationType: "EXTERNAL_PARTNER",
    industry: "Cultural institution, Hanoi",
    classificationConfidence:
      "High: fixture describes an external cultural institution partner.",
    description:
      "DEMO partner from static fixture org-heritage. Cultural archive used for the completed-project close-out path.",
    supports: ["archive-digitisation", "app-archive"],
  },
  {
    key: "org:demo-health",
    sourceFixtureId: "org-health",
    name: "VinUni Health Sciences",
    organizationType: "INTERNAL_UNIT",
    industry: "University lab, Hanoi",
    classificationConfidence:
      "High: fixture explicitly identifies a VinUni university lab/clinical research group.",
    description:
      "DEMO internal unit from static fixture org-health. Clinical research group used for the rejected solo assessment scenario.",
    supports: ["triage-protocol-review", "app-triage"],
  },
];

export const DEMO_CONTACT_USERS: DemoContactSeed[] = [
  {
    key: "user:contact-org-bencang",
    sourceFixtureId: "org-bencang.contact",
    email: "contact.bencang.demo@example.test",
    fullName: "Dung Tran",
    jobTitle: "Head of Operations Analytics",
    organizationKey: "org:demo-bencang",
  },
  {
    key: "user:contact-org-vhf",
    sourceFixtureId: "org-vhf.contact",
    email: "contact.vhf.demo@example.test",
    fullName: "Ngoc Bui",
    jobTitle: "Outreach Lead",
    organizationKey: "org:demo-vhf",
  },
  {
    key: "user:contact-org-facilities",
    sourceFixtureId: "org-facilities.contact",
    email: "contact.facilities.demo@example.test",
    fullName: "Hai Do",
    jobTitle: "Facilities Manager",
    organizationKey: "org:demo-facilities",
  },
  {
    key: "user:contact-org-heritage",
    sourceFixtureId: "org-heritage.contact",
    email: "contact.heritage.demo@example.test",
    fullName: "Thu Hoang",
    jobTitle: "Head of Digital Collections",
    organizationKey: "org:demo-heritage",
  },
  {
    key: "user:contact-org-health",
    sourceFixtureId: "org-health.contact",
    email: "contact.health-sciences.demo@example.test",
    fullName: "Dr. Lan Nguyen",
    jobTitle: "Associate Dean, Research",
    organizationKey: "org:demo-health",
  },
];

export const DEMO_STUDENTS: DemoStudentSeed[] = [
  {
    key: "user:stu-jordan-lee",
    sourceFixtureId: "stu-jordan-lee",
    email: "student.jordan-lee.demo@example.test",
    fullName: "Jordan Lee",
    school: "CECS",
    major: "Computer Engineering",
    studyYear: 3,
    gpa: 3.82,
    gpaScale: 4,
    availableHoursPerWeek: 15,
    about:
      "Third-year computer engineering student working on applied ML and data pipelines.",
    skills: [
      "Python",
      "C++",
      "PyTorch",
      "Computer vision",
      "Data analysis",
      "Sensor integration",
      "React",
    ],
  },
  {
    key: "user:stu-priya-raman",
    sourceFixtureId: "stu-priya-raman",
    email: "student.priya-raman.demo@example.test",
    fullName: "Priya Raman",
    school: "CECS",
    major: "Computer Science",
    studyYear: 3,
    availableHoursPerWeek: 12,
    about:
      "Backend engineer focused on schemas, ingestion, and resilient data pipelines.",
    skills: ["Python", "SQL", "dbt", "Airflow", "PostgreSQL"],
  },
  {
    key: "user:stu-minh-anh",
    sourceFixtureId: "stu-minh-anh",
    email: "student.minh-anh.demo@example.test",
    fullName: "Minh Anh Nguyen",
    school: "CBM",
    major: "Business Analytics",
    studyYear: 2,
    availableHoursPerWeek: 10,
    about:
      "Business analytics student focused on turning operational data into decisions.",
    skills: ["SQL", "Tableau", "Excel modelling", "Data analysis"],
  },
  {
    key: "user:stu-hoang-tran",
    sourceFixtureId: "stu-hoang-tran",
    email: "student.hoang-tran.demo@example.test",
    fullName: "Hoang Tran",
    school: "CECS",
    major: "Mechanical Engineering",
    studyYear: 4,
    availableHoursPerWeek: 8,
    about:
      "Mechanical engineering student comfortable with logistics, coordination, and process work.",
    skills: ["CAD", "Process design", "Project coordination", "Excel modelling"],
  },
  {
    key: "user:stu-bao-tran",
    sourceFixtureId: "stu-bao-tran",
    email: "student.bao-tran.demo@example.test",
    fullName: "Bao Tran",
    school: "CECS",
    major: "Computer Science",
    studyYear: 3,
    availableHoursPerWeek: 10,
    about:
      "Computer science student interested in optimisation and routing solvers.",
    skills: ["Python", "OR-Tools", "Optimisation", "C++", "Data analysis"],
  },
  {
    key: "user:stu-linh-pham",
    sourceFixtureId: "stu-linh-pham",
    email: "student.linh-pham.demo@example.test",
    fullName: "Linh Pham",
    school: "CAS",
    major: "Design",
    studyYear: 2,
    availableHoursPerWeek: 14,
    about:
      "Designer who codes enough to ship and studies operational tools under pressure.",
    skills: ["Figma", "React", "Design systems", "User research"],
  },
  {
    key: "user:stu-thao-ha",
    sourceFixtureId: "stu-thao-ha",
    email: "student.thao-ha.demo@example.test",
    fullName: "Thao Ha",
    school: "CBM",
    major: "Economics",
    studyYear: 3,
    availableHoursPerWeek: 6,
    about:
      "Economics student with a research focus on demand modelling and policy evaluation.",
    skills: ["Stata", "Econometrics", "Survey design", "R"],
  },
];

export const DEMO_FACULTY: DemoFacultySeed[] = [
  {
    key: "user:fac-pham",
    sourceFixtureId: "fac-pham",
    email: "faculty.minh-pham.demo@example.test",
    fullName: "Dr. Minh Pham",
    school: "CECS",
    department: "Computer Science",
    academicTitle: "Professor",
    maxActiveSupervisions: 5,
  },
  {
    key: "user:fac-nguyen-k",
    sourceFixtureId: "fac-nguyen-k",
    email: "faculty.kevin-nguyen.demo@example.test",
    fullName: "Dr. Kevin Nguyen",
    school: "CECS",
    department: "Electrical Engineering",
    academicTitle: "Assistant Professor",
    maxActiveSupervisions: 4,
  },
  {
    key: "user:fac-osei",
    sourceFixtureId: "fac-osei",
    email: "faculty.diane-osei.demo@example.test",
    fullName: "Dr. Diane Osei",
    school: "CBM",
    department: "Analytics & Operations",
    academicTitle: "Associate Professor",
    maxActiveSupervisions: 4,
  },
  {
    key: "user:fac-vu",
    sourceFixtureId: "fac-vu",
    email: "faculty.lan-vu.demo@example.test",
    fullName: "Dr. Lan Vu",
    school: "CHS",
    department: "Public Health",
    academicTitle: "Associate Professor",
    maxActiveSupervisions: 5,
  },
  {
    key: "user:fac-le",
    sourceFixtureId: "fac-le",
    email: "faculty.thu-le.demo@example.test",
    fullName: "Dr. Thu Le",
    school: "CAS",
    department: "Environmental Science",
    academicTitle: "Assistant Professor",
    maxActiveSupervisions: 4,
  },
  {
    key: "user:fac-tran",
    sourceFixtureId: "fac-tran",
    email: "faculty.bao-tran.demo@example.test",
    fullName: "Dr. Bao Tran",
    school: "CAS",
    department: "Physics",
    academicTitle: "Professor",
    maxActiveSupervisions: 3,
  },
];

const canonicalSkillByNormalizedLabel = new Map(
  SKILL_SEEDS.flatMap((seed) =>
    [seed.name, ...seed.sourceLabels].map((label) => [
      normalizeSkillLookup(label),
      seed.name,
    ])
  )
);

for (const alias of SKILL_ALIASES) {
  canonicalSkillByNormalizedLabel.set(
    normalizeSkillLookup(alias.alias),
    alias.skillName
  );
}

function canonicalSkillNameFor(rawSkillName: string): string {
  const canonicalName = canonicalSkillByNormalizedLabel.get(
    normalizeSkillLookup(rawSkillName)
  );

  if (!canonicalName) {
    throw new Error(
      `DEMO student skill "${rawSkillName}" does not resolve to the Phase 3.1 taxonomy.`
    );
  }

  return canonicalName;
}

async function ensureDemoOrganization(
  ctx: SeedContext,
  seed: DemoOrganizationSeed
) {
  const existing = await ctx.tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, seed.name))
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed ${seed.key}: multiple organizations named "${seed.name}" already exist.`
    );
  }

  if (existing[0]) {
    const [updated] = await ctx.tx
      .update(organizations)
      .set({
        description: seed.description,
        industry: seed.industry,
        organizationType: seed.organizationType,
        updatedAt: new Date(),
        verificationStatus: "VERIFIED",
      })
      .where(eq(organizations.id, existing[0].id))
      .returning({ id: organizations.id });

    ctx.setId(seed.key, updated.id);
    return updated.id;
  }

  const [created] = await ctx.tx
    .insert(organizations)
    .values({
      description: seed.description,
      industry: seed.industry,
      name: seed.name,
      organizationType: seed.organizationType,
      verificationStatus: "VERIFIED",
    })
    .returning({ id: organizations.id });

  ctx.setId(seed.key, created.id);
  return created.id;
}

async function ensureDemoUser(
  ctx: SeedContext,
  seed: Pick<DemoContactSeed | DemoStudentSeed | DemoFacultySeed, "email" | "fullName" | "key">
) {
  const [user] = await ctx.tx
    .insert(users)
    .values({
      email: seed.email,
      fullName: seed.fullName,
      status: "ACTIVE",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        fullName: seed.fullName,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  ctx.setId(seed.key, user.id);
  return user.id;
}

async function ensureDemoContactMembership(
  ctx: SeedContext,
  seed: DemoContactSeed
) {
  const userId = ctx.getId(seed.key);
  const organizationId = ctx.getId(seed.organizationKey);

  const [membership] = await ctx.tx
    .insert(organizationMemberships)
    .values({
      jobTitle: seed.jobTitle,
      organizationId,
      role: "CONTACT_PERSON",
      status: "ACTIVE",
      userId,
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberships.userId,
        organizationMemberships.organizationId,
        organizationMemberships.role,
      ],
      set: {
        jobTitle: seed.jobTitle,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    })
    .returning({ id: organizationMemberships.id });

  ctx.setId(
    `membership:${seed.key}:${seed.organizationKey}:contact-person`,
    membership.id
  );
  return membership.id;
}

async function ensureDemoStudentProfile(
  ctx: SeedContext,
  seed: DemoStudentSeed
) {
  const userId = ctx.getId(seed.key);

  await ctx.tx
    .insert(studentProfiles)
    .values({
      aiMatchingConsent: false,
      availableHoursPerWeek: seed.availableHoursPerWeek,
      gpa: seed.gpa,
      gpaScale: seed.gpaScale,
      interests: seed.about,
      major: seed.major,
      profileVisibility: "VINUNI_ONLY",
      school: seed.school,
      studyYear: seed.studyYear,
      userId,
    })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: {
        aiMatchingConsent: false,
        availableHoursPerWeek: seed.availableHoursPerWeek,
        gpa: seed.gpa,
        gpaScale: seed.gpaScale,
        interests: seed.about,
        major: seed.major,
        profileVisibility: "VINUNI_ONLY",
        school: seed.school,
        studyYear: seed.studyYear,
        updatedAt: new Date(),
      },
    });
}

async function ensureDemoFacultyProfile(
  ctx: SeedContext,
  seed: DemoFacultySeed
) {
  const userId = ctx.getId(seed.key);

  await ctx.tx
    .insert(facultyProfiles)
    .values({
      academicTitle: seed.academicTitle,
      department: seed.department,
      maxActiveSupervisions: seed.maxActiveSupervisions,
      school: seed.school,
      userId,
    })
    .onConflictDoUpdate({
      target: facultyProfiles.userId,
      set: {
        academicTitle: seed.academicTitle,
        department: seed.department,
        maxActiveSupervisions: seed.maxActiveSupervisions,
        school: seed.school,
        updatedAt: new Date(),
      },
    });
}

async function ensureDemoStudentSkills(ctx: SeedContext, seed: DemoStudentSeed) {
  const studentId = ctx.getId(seed.key);

  for (const rawSkillName of seed.skills) {
    const canonicalName = canonicalSkillNameFor(rawSkillName);
    const skillId = ctx.getId(`skill:${canonicalName}`);

    const existing = await ctx.tx
      .select({ id: studentSkills.id })
      .from(studentSkills)
      .where(
        and(
          eq(studentSkills.studentId, studentId),
          eq(studentSkills.skillId, skillId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await ctx.tx
        .update(studentSkills)
        .set({
          normalizationStatus: "NORMALIZED",
          rawSkillName,
          source: "SELF_DECLARED",
          updatedAt: new Date(),
        })
        .where(eq(studentSkills.id, existing[0].id));
      continue;
    }

    await ctx.tx.insert(studentSkills).values({
      normalizationStatus: "NORMALIZED",
      rawSkillName,
      skillId,
      source: "SELF_DECLARED",
      studentId,
    });
  }
}

export async function seedDemo(ctx: SeedContext) {
  for (const organization of DEMO_ORGANIZATIONS) {
    await ensureDemoOrganization(ctx, organization);
  }

  ctx.record("DEMO", "organizations", DEMO_ORGANIZATIONS.length);

  for (const contact of DEMO_CONTACT_USERS) {
    await ensureDemoUser(ctx, contact);
  }

  for (const student of DEMO_STUDENTS) {
    await ensureDemoUser(ctx, student);
  }

  for (const faculty of DEMO_FACULTY) {
    await ensureDemoUser(ctx, faculty);
  }

  ctx.record(
    "DEMO",
    "users",
    DEMO_CONTACT_USERS.length + DEMO_STUDENTS.length + DEMO_FACULTY.length
  );

  for (const contact of DEMO_CONTACT_USERS) {
    await ensureDemoContactMembership(ctx, contact);
  }

  ctx.record("DEMO", "contact memberships", DEMO_CONTACT_USERS.length);

  for (const student of DEMO_STUDENTS) {
    await ensureDemoStudentProfile(ctx, student);
  }

  ctx.record("DEMO", "student profiles", DEMO_STUDENTS.length);

  for (const faculty of DEMO_FACULTY) {
    await ensureDemoFacultyProfile(ctx, faculty);
  }

  ctx.record("DEMO", "faculty profiles", DEMO_FACULTY.length);

  for (const student of DEMO_STUDENTS) {
    await ensureDemoStudentSkills(ctx, student);
  }

  const studentSkillCount = DEMO_STUDENTS.reduce(
    (total, student) => total + student.skills.length,
    0
  );

  ctx.record("DEMO", "student skills", studentSkillCount);
}
