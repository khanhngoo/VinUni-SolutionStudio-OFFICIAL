import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { assessmentTrackLabel } from "@/services/assessment-track";
import {
  applications,
  assessmentQuestions,
  assessments,
  assessmentSections,
  challengeEligibilityRules,
  challengeFacultyAssignments,
  challenges,
  challengeSkills,
  facultyProfiles,
  organizationMemberships,
  organizations,
  projectMembers,
  projects,
  skills,
  studentProfiles,
  studentSkills,
  users,
} from "@/db/schema";

type ChallengeRow = typeof challenges.$inferSelect;
type ChallengeStatus = NonNullable<ChallengeRow["status"]>;
type ChallengeVisibility = NonNullable<ChallengeRow["visibility"]>;
type CompensationType = NonNullable<ChallengeRow["compensationType"]>;
type WorkMode = NonNullable<ChallengeRow["workMode"]>;
type SkillRequirementType = typeof challengeSkills.$inferSelect["requirementType"];
type EligibilityRuleType = typeof challengeEligibilityRules.$inferSelect["ruleType"];
type FacultyAssignmentStatus =
  typeof challengeFacultyAssignments.$inferSelect["status"];
type OrganizationType = typeof organizations.$inferSelect["organizationType"];
type OrganizationVerificationStatus =
  typeof organizations.$inferSelect["verificationStatus"];

type InternalChallengeId = bigint;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const MARKETPLACE_STATUSES = [
  "PUBLISHED",
  "APPLICATIONS_OPEN",
] satisfies ChallengeStatus[];

const MARKETPLACE_VISIBILITIES = [
  "PUBLIC_PREVIEW",
  "VINUNI_ONLY",
  "PRIVATE",
] satisfies ChallengeVisibility[];

export type PublishedChallengeSort =
  | "applicationDeadline"
  | "newest"
  | "durationWeeks"
  | "startDate";

export interface ListPublishedChallengesFilters {
  compensationType?: CompensationType | CompensationType[];
  domain?: string | string[];
  ownerOrganizationName?: string | string[];
  school?: string | string[];
  search?: string;
  skill?: string | string[];
  subtype?: string | string[];
  visibility?: ChallengeVisibility | ChallengeVisibility[];
  workMode?: WorkMode | WorkMode[];
}

export interface ListPublishedChallengesOptions {
  filters?: ListPublishedChallengesFilters;
  page?: number;
  pageSize?: number;
  sort?: PublishedChallengeSort;
}

export interface ChallengeOrganizationSummary {
  displayName: string;
  industry: string | null;
  name: string | null;
  nameIsPublic: boolean;
  organizationType: OrganizationType;
  verificationStatus: OrganizationVerificationStatus;
}

export interface ChallengeSkillRead {
  canonicalName: string;
  requirementType: SkillRequirementType;
}

export interface ChallengeEligibilitySummary {
  minGpa: number | null;
  schools: string[] | null;
  studyYears: number[] | null;
}

export interface ChallengeListItem {
  applicantCount: number;
  applicationDeadline: Date | null;
  compensationDescription: string | null;
  compensationType: CompensationType;
  confidentialityLevel: string | null;
  domain: string | null;
  durationWeeks: number | null;
  eligibilitySummary: ChallengeEligibilitySummary;
  managingOrganization: ChallengeOrganizationSummary;
  ownerOrganization: ChallengeOrganizationSummary;
  publicId: string;
  skills: ChallengeSkillRead[];
  slug: string;
  startDate: string | null;
  status: ChallengeStatus;
  subtype: string | null;
  summary: string;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
  visibility: ChallengeVisibility;
  weeklyHours: number | null;
  workMode: WorkMode | null;
}

export interface PublishedChallengePage {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: ChallengeListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ChallengeEligibilityConfig =
  | { minGpa: number; scale?: number }
  | { studyYears: number[] }
  | { schools: string[] }
  | { majors: string[] }
  | { availableHours: number }
  | { maxActiveProjects: number }
  | Record<string, unknown>
  | null;

export interface ChallengeEligibilityRuleRead {
  config: ChallengeEligibilityConfig;
  required: boolean;
  ruleType: EligibilityRuleType;
}

export interface ChallengeFacultyAssignmentRead {
  assignedAt: Date | null;
  comments: string | null;
  faculty: {
    academicTitle: string | null;
    department: string | null;
    displayName: string;
    school: string | null;
  };
  status: FacultyAssignmentStatus;
}

export interface ChallengeAssessmentSummaryRead {
  timeLimitMinutes: number | null;
  trackLabel: string;
}

export interface StudentEligibilityProfileRead {
  activeProjectCount: number;
  availableHoursPerWeek: number | null;
  gpa: number | null;
  gpaScale: number | null;
  major: string | null;
  school: string | null;
  studyYear: number | null;
}

export interface ChallengeDetail extends ChallengeListItem {
  assessmentSummary: ChallengeAssessmentSummaryRead | null;
  contactPerson: {
    displayName: string;
    email: string | null;
    roleLabel: string | null;
  } | null;
  description: string;
  eligibilityRules: ChallengeEligibilityRuleRead[];
  expectedDeliverables: string | null;
  fullBrief: string | null;
  interviewFormat: string | null;
  facultyAssignments: ChallengeFacultyAssignmentRead[];
}

interface BaseChallengeRow {
  applicantCount: number;
  applicationDeadline: Date | null;
  compensationDescription: string | null;
  compensationType: CompensationType;
  confidentialityLevel: string | null;
  createdAt: Date | null;
  description: string;
  domain: string | null;
  durationWeeks: number | null;
  expectedDeliverables: string | null;
  fullBrief: string | null;
  interviewFormat: string | null;
  internalId: InternalChallengeId;
  managingOrganization: ChallengeOrganizationSummary;
  ownerOrganization: ChallengeOrganizationSummary;
  publicId: string;
  slug: string | null;
  startDate: string | null;
  status: ChallengeStatus;
  subtype: string | null;
  summary: string;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
  visibility: ChallengeVisibility;
  weeklyHours: number | null;
  workMode: WorkMode | null;
}

interface EligibilityRow {
  challengeId: InternalChallengeId;
  config: unknown;
  required: boolean | null;
  ruleType: EligibilityRuleType;
}

function normalizePage(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE;
  return Math.max(1, Math.floor(value ?? DEFAULT_PAGE));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value ?? DEFAULT_PAGE_SIZE)));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function trimmedStrings(value: string | string[] | undefined) {
  return toArray(value)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function jsonbTextArrayContainsAny(
  column: typeof challengeEligibilityRules.config,
  key: string,
  values: string[]
) {
  return sql`${column}->${key} ?| array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  )}]`;
}

function existsSkillFilter(values: string[]) {
  if (values.length === 0) return undefined;

  return sql`exists (
    select 1
    from ${challengeSkills}
    inner join ${skills} on ${skills.id} = ${challengeSkills.skillId}
    where ${challengeSkills.challengeId} = ${challenges.id}
      and ${skills.canonicalName} in (${sql.join(
        values.map((value) => sql`${value}`),
        sql`, `
      )})
  )`;
}

function existsSchoolEligibilityFilter(values: string[]) {
  if (values.length === 0) return undefined;

  return sql`exists (
    select 1
    from ${challengeEligibilityRules}
    where ${challengeEligibilityRules.challengeId} = ${challenges.id}
      and ${challengeEligibilityRules.ruleType} = 'SCHOOL'
      and ${jsonbTextArrayContainsAny(challengeEligibilityRules.config, "schools", values)}
  )`;
}

function textIn(column: SQL, values: string[]) {
  return sql`${column} in (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  )})`;
}

function textIlike(column: SQL, value: string) {
  return sql`${column} ilike ${value}`;
}

function buildWhereClause(
  ownerOrganizationNameColumn: SQL,
  managingOrganizationNameColumn: SQL,
  filters: ListPublishedChallengesFilters | undefined
) {
  const conditions: SQL[] = [
    inArray(challenges.status, MARKETPLACE_STATUSES),
    inArray(challenges.visibility, MARKETPLACE_VISIBILITIES),
  ];

  const subtype = trimmedStrings(filters?.subtype);
  const domain = trimmedStrings(filters?.domain);
  const ownerOrganizationName = trimmedStrings(filters?.ownerOrganizationName);
  const school = trimmedStrings(filters?.school);
  const skill = trimmedStrings(filters?.skill);
  const search = filters?.search?.trim();
  const compensationType = toArray(filters?.compensationType);
  const visibility = toArray(filters?.visibility);
  const workMode = toArray(filters?.workMode);

  if (subtype.length > 0) conditions.push(inArray(challenges.subtype, subtype));
  if (compensationType.length > 0) {
    conditions.push(inArray(challenges.compensationType, compensationType));
  }
  if (visibility.length > 0) conditions.push(inArray(challenges.visibility, visibility));
  if (workMode.length > 0) conditions.push(inArray(challenges.workMode, workMode));
  if (ownerOrganizationName.length > 0) {
    conditions.push(textIn(ownerOrganizationNameColumn, ownerOrganizationName));
  }

  const schoolFilter = existsSchoolEligibilityFilter(school);
  if (schoolFilter) conditions.push(schoolFilter);

  const skillFilter = existsSkillFilter(skill);
  if (skillFilter) conditions.push(skillFilter);

  if (domain.length > 0) {
    const domainConditions = domain.map((value) =>
      ilike(challenges.domain, `%${value}%`)
    );
    const domainClause = or(...domainConditions);
    if (domainClause) conditions.push(domainClause);
  }

  if (search) {
    const like = `%${search}%`;
    const searchClause = or(
      ilike(challenges.title, like),
      ilike(challenges.summary, like),
      ilike(challenges.domain, like),
      textIlike(ownerOrganizationNameColumn, like),
      textIlike(managingOrganizationNameColumn, like)
    );
    if (searchClause) conditions.push(searchClause);
  }

  return and(...conditions);
}

function sortExpressions(sort: PublishedChallengeSort | undefined) {
  switch (sort) {
    case "newest":
      return [desc(challenges.createdAt), asc(challenges.slug)];
    case "durationWeeks":
      return [asc(challenges.durationWeeks), asc(challenges.slug)];
    case "startDate":
      return [asc(challenges.startDate), asc(challenges.slug)];
    case "applicationDeadline":
    default:
      return [asc(challenges.applicationDeadline), asc(challenges.slug)];
  }
}

function organizationSummary(
  row: {
    industry: string | null;
    name: string;
    organizationType: OrganizationType;
    verificationStatus: OrganizationVerificationStatus;
  }
): ChallengeOrganizationSummary {
  return {
    displayName: row.name,
    industry: row.industry,
    name: row.name,
    nameIsPublic: true,
    organizationType: row.organizationType,
    verificationStatus: row.verificationStatus,
  };
}

async function selectBaseChallengeRows(
  options: Required<Pick<ListPublishedChallengesOptions, "page" | "pageSize">> &
    Pick<ListPublishedChallengesOptions, "filters" | "sort">
) {
  const ownerOrganization = alias(organizations, "owner_organization");
  const managingOrganization = alias(organizations, "managing_organization");
  const whereClause = buildWhereClause(
    sql`${ownerOrganization.name}`,
    sql`${managingOrganization.name}`,
    options.filters
  );
  const offset = (options.page - 1) * options.pageSize;

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(challenges)
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .where(whereClause);

  const rows = await db
    .select({
      applicantCount: sql<number>`count(${applications.id})::int`,
      applicationDeadline: challenges.applicationDeadline,
      compensationDescription: challenges.compensationDescription,
      compensationType: challenges.compensationType,
      confidentialityLevel: challenges.confidentialityLevel,
      createdAt: challenges.createdAt,
      description: challenges.description,
      domain: challenges.domain,
      durationWeeks: challenges.durationWeeks,
      expectedDeliverables: challenges.expectedDeliverables,
      fullBrief: challenges.fullBrief,
      interviewFormat: challenges.interviewFormat,
      internalId: challenges.id,
      managingOrganizationIndustry: managingOrganization.industry,
      managingOrganizationName: managingOrganization.name,
      managingOrganizationType: managingOrganization.organizationType,
      managingOrganizationVerificationStatus:
        managingOrganization.verificationStatus,
      ownerOrganizationIndustry: ownerOrganization.industry,
      ownerOrganizationName: ownerOrganization.name,
      ownerOrganizationType: ownerOrganization.organizationType,
      ownerOrganizationVerificationStatus: ownerOrganization.verificationStatus,
      publicId: challenges.publicId,
      slug: challenges.slug,
      startDate: challenges.startDate,
      status: challenges.status,
      subtype: challenges.subtype,
      summary: challenges.summary,
      teamSizeMax: challenges.teamSizeMax,
      teamSizeMin: challenges.teamSizeMin,
      title: challenges.title,
      visibility: challenges.visibility,
      weeklyHours: challenges.weeklyHours,
      workMode: challenges.workMode,
    })
    .from(challenges)
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .leftJoin(applications, eq(applications.challengeId, challenges.id))
    .where(whereClause)
    .groupBy(
      challenges.id,
      ownerOrganization.id,
      managingOrganization.id
    )
    .orderBy(...sortExpressions(options.sort))
    .limit(options.pageSize)
    .offset(offset);

  return {
    rows: rows.map(
      (row): BaseChallengeRow => ({
        applicantCount: row.applicantCount,
        applicationDeadline: row.applicationDeadline,
        compensationDescription: row.compensationDescription,
        compensationType: row.compensationType ?? "NOT_SPECIFIED",
        confidentialityLevel: row.confidentialityLevel,
        createdAt: row.createdAt,
        description: row.description,
        domain: row.domain,
        durationWeeks: row.durationWeeks,
        expectedDeliverables: row.expectedDeliverables,
        fullBrief: row.fullBrief,
        interviewFormat: row.interviewFormat,
        internalId: row.internalId,
        managingOrganization: organizationSummary({
          industry: row.managingOrganizationIndustry,
          name: row.managingOrganizationName,
          organizationType: row.managingOrganizationType,
          verificationStatus:
            row.managingOrganizationVerificationStatus ?? "PENDING",
        }),
        ownerOrganization: organizationSummary({
          industry: row.ownerOrganizationIndustry,
          name: row.ownerOrganizationName,
          organizationType: row.ownerOrganizationType,
          verificationStatus: row.ownerOrganizationVerificationStatus ?? "PENDING",
        }),
        publicId: row.publicId,
        slug: row.slug,
        startDate: row.startDate,
        status: row.status ?? "DRAFT",
        subtype: row.subtype,
        summary: row.summary,
        teamSizeMax: row.teamSizeMax,
        teamSizeMin: row.teamSizeMin,
        title: row.title,
        visibility: row.visibility ?? "VINUNI_ONLY",
        weeklyHours: row.weeklyHours,
        workMode: row.workMode,
      })
    ),
    total: totalRows[0]?.total ?? 0,
  };
}

async function selectBaseChallengeRowBySlug(slug: string) {
  const ownerOrganization = alias(organizations, "owner_organization");
  const managingOrganization = alias(organizations, "managing_organization");
  const whereClause = and(
    buildWhereClause(
      sql`${ownerOrganization.name}`,
      sql`${managingOrganization.name}`,
      undefined
    ),
    eq(challenges.slug, slug)
  );

  const rows = await db
    .select({
      applicantCount: sql<number>`count(${applications.id})::int`,
      applicationDeadline: challenges.applicationDeadline,
      compensationDescription: challenges.compensationDescription,
      compensationType: challenges.compensationType,
      confidentialityLevel: challenges.confidentialityLevel,
      createdAt: challenges.createdAt,
      description: challenges.description,
      domain: challenges.domain,
      durationWeeks: challenges.durationWeeks,
      expectedDeliverables: challenges.expectedDeliverables,
      fullBrief: challenges.fullBrief,
      interviewFormat: challenges.interviewFormat,
      internalId: challenges.id,
      managingOrganizationIndustry: managingOrganization.industry,
      managingOrganizationName: managingOrganization.name,
      managingOrganizationType: managingOrganization.organizationType,
      managingOrganizationVerificationStatus:
        managingOrganization.verificationStatus,
      ownerOrganizationIndustry: ownerOrganization.industry,
      ownerOrganizationName: ownerOrganization.name,
      ownerOrganizationType: ownerOrganization.organizationType,
      ownerOrganizationVerificationStatus: ownerOrganization.verificationStatus,
      publicId: challenges.publicId,
      slug: challenges.slug,
      startDate: challenges.startDate,
      status: challenges.status,
      subtype: challenges.subtype,
      summary: challenges.summary,
      teamSizeMax: challenges.teamSizeMax,
      teamSizeMin: challenges.teamSizeMin,
      title: challenges.title,
      visibility: challenges.visibility,
      weeklyHours: challenges.weeklyHours,
      workMode: challenges.workMode,
    })
    .from(challenges)
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .leftJoin(applications, eq(applications.challengeId, challenges.id))
    .where(whereClause)
    .groupBy(
      challenges.id,
      ownerOrganization.id,
      managingOrganization.id
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    applicantCount: row.applicantCount,
    applicationDeadline: row.applicationDeadline,
    compensationDescription: row.compensationDescription,
    compensationType: row.compensationType ?? "NOT_SPECIFIED",
    confidentialityLevel: row.confidentialityLevel,
    createdAt: row.createdAt,
    description: row.description,
    domain: row.domain,
    durationWeeks: row.durationWeeks,
    expectedDeliverables: row.expectedDeliverables,
    fullBrief: row.fullBrief,
    interviewFormat: row.interviewFormat,
    internalId: row.internalId,
    managingOrganization: organizationSummary({
      industry: row.managingOrganizationIndustry,
      name: row.managingOrganizationName,
      organizationType: row.managingOrganizationType,
      verificationStatus: row.managingOrganizationVerificationStatus ?? "PENDING",
    }),
    ownerOrganization: organizationSummary({
      industry: row.ownerOrganizationIndustry,
      name: row.ownerOrganizationName,
      organizationType: row.ownerOrganizationType,
      verificationStatus: row.ownerOrganizationVerificationStatus ?? "PENDING",
    }),
    publicId: row.publicId,
    slug: row.slug,
    startDate: row.startDate,
    status: row.status ?? "DRAFT",
    subtype: row.subtype,
    summary: row.summary,
    teamSizeMax: row.teamSizeMax,
    teamSizeMin: row.teamSizeMin,
    title: row.title,
    visibility: row.visibility ?? "VINUNI_ONLY",
    weeklyHours: row.weeklyHours,
    workMode: row.workMode,
  } satisfies BaseChallengeRow;
}

async function selectSkills(challengeIds: InternalChallengeId[]) {
  if (challengeIds.length === 0) return new Map<InternalChallengeId, ChallengeSkillRead[]>();

  const rows = await db
    .select({
      challengeId: challengeSkills.challengeId,
      canonicalName: skills.canonicalName,
      requirementType: challengeSkills.requirementType,
    })
    .from(challengeSkills)
    .innerJoin(skills, eq(skills.id, challengeSkills.skillId))
    .where(inArray(challengeSkills.challengeId, challengeIds))
    .orderBy(
      challengeSkills.challengeId,
      sql`case ${challengeSkills.requirementType}
        when 'REQUIRED' then 0
        when 'PREFERRED' then 1
        else 2
      end`,
      asc(skills.canonicalName)
    );

  const grouped = new Map<InternalChallengeId, ChallengeSkillRead[]>();
  for (const row of rows) {
    const current = grouped.get(row.challengeId) ?? [];
    current.push({
      canonicalName: row.canonicalName,
      requirementType: row.requirementType,
    });
    grouped.set(row.challengeId, current);
  }

  return grouped;
}

async function selectEligibilityRules(challengeIds: InternalChallengeId[]) {
  if (challengeIds.length === 0) return new Map<InternalChallengeId, EligibilityRow[]>();

  const rows = await db
    .select({
      challengeId: challengeEligibilityRules.challengeId,
      config: challengeEligibilityRules.config,
      required: challengeEligibilityRules.required,
      ruleType: challengeEligibilityRules.ruleType,
    })
    .from(challengeEligibilityRules)
    .where(inArray(challengeEligibilityRules.challengeId, challengeIds))
    .orderBy(
      challengeEligibilityRules.challengeId,
      sql`case ${challengeEligibilityRules.ruleType}
        when 'MIN_GPA' then 0
        when 'STUDY_YEAR' then 1
        when 'SCHOOL' then 2
        else 3
      end`
    );

  const grouped = new Map<InternalChallengeId, EligibilityRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.challengeId) ?? [];
    current.push(row);
    grouped.set(row.challengeId, current);
  }

  return grouped;
}

async function selectFacultyAssignments(challengeId: InternalChallengeId) {
  const rows = await db
    .select({
      academicTitle: facultyProfiles.academicTitle,
      assignedAt: challengeFacultyAssignments.assignedAt,
      comments: challengeFacultyAssignments.comments,
      department: facultyProfiles.department,
      displayName: users.fullName,
      school: facultyProfiles.school,
      status: challengeFacultyAssignments.status,
    })
    .from(challengeFacultyAssignments)
    .innerJoin(users, eq(users.id, challengeFacultyAssignments.facultyId))
    .innerJoin(
      facultyProfiles,
      eq(facultyProfiles.userId, challengeFacultyAssignments.facultyId)
    )
    .where(eq(challengeFacultyAssignments.challengeId, challengeId))
    .orderBy(
      sql`case ${challengeFacultyAssignments.status}
        when 'ACCEPTED' then 0
        when 'PENDING' then 1
        else 2
      end`,
      asc(users.fullName)
    );

  return rows.map(
    (row): ChallengeFacultyAssignmentRead => ({
      assignedAt: row.assignedAt,
      comments: row.comments,
      faculty: {
        academicTitle: row.academicTitle,
        department: row.department,
        displayName: row.displayName,
        school: row.school,
      },
      status: row.status ?? "PENDING",
    })
  );
}

async function selectContactPerson(challengeId: InternalChallengeId) {
  const rows = await db
    .select({
      displayName: users.fullName,
      email: users.email,
      roleLabel: organizationMemberships.role,
    })
    .from(challenges)
    .innerJoin(users, eq(users.id, challenges.contactPersonId))
    .leftJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.userId, users.id),
        eq(organizationMemberships.organizationId, challenges.ownerOrganizationId)
      )
    )
    .where(eq(challenges.id, challengeId))
    .limit(1);

  return rows[0] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length === value.length ? strings : null;
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const numbers = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item)
  );
  return numbers.length === value.length ? numbers : null;
}

function hasNumberField<K extends string>(
  value: unknown,
  key: K
): value is Record<K, number> {
  return isRecord(value) && typeof value[key] === "number";
}

function hasStringArrayField<K extends string>(
  value: unknown,
  key: K
): value is Record<K, string[]> {
  return isRecord(value) && asStringArray(value[key]) !== null;
}

function hasNumberArrayField<K extends string>(
  value: unknown,
  key: K
): value is Record<K, number[]> {
  return isRecord(value) && asNumberArray(value[key]) !== null;
}

function toEligibilityConfig(
  ruleType: EligibilityRuleType,
  config: unknown
): ChallengeEligibilityConfig {
  if (!isRecord(config)) return null;

  switch (ruleType) {
    case "MIN_GPA": {
      const minGpa = asNumber(config.minGpa);
      if (minGpa === null) return config;
      const scale = asNumber(config.scale);
      return scale === null ? { minGpa } : { minGpa, scale };
    }
    case "STUDY_YEAR": {
      const studyYears = asNumberArray(config.studyYears);
      return studyYears ? { studyYears } : config;
    }
    case "SCHOOL": {
      const schools = asStringArray(config.schools);
      return schools ? { schools } : config;
    }
    case "MAJOR": {
      const majors = asStringArray(config.majors);
      return majors ? { majors } : config;
    }
    case "AVAILABLE_HOURS": {
      const availableHours = asNumber(config.availableHours);
      return availableHours === null ? config : { availableHours };
    }
    case "MAX_ACTIVE_PROJECTS": {
      const maxActiveProjects = asNumber(config.maxActiveProjects);
      return maxActiveProjects === null ? config : { maxActiveProjects };
    }
    default:
      return config;
  }
}

function eligibilitySummary(rows: EligibilityRow[]): ChallengeEligibilitySummary {
  let minGpa: number | null = null;
  let schools: string[] | null = null;
  let studyYears: number[] | null = null;

  for (const row of rows) {
    const config = toEligibilityConfig(row.ruleType, row.config);
    if (config === null) continue;

    if (hasNumberField(config, "minGpa")) minGpa = config.minGpa;
    if (hasStringArrayField(config, "schools")) schools = config.schools;
    if (hasNumberArrayField(config, "studyYears")) {
      studyYears = config.studyYears;
    }
  }

  return { minGpa, schools, studyYears };
}

function mapListItem(
  row: BaseChallengeRow,
  skillMap: Map<InternalChallengeId, ChallengeSkillRead[]>,
  eligibilityMap: Map<InternalChallengeId, EligibilityRow[]>
): ChallengeListItem {
  return {
    applicantCount: row.applicantCount,
    applicationDeadline: row.applicationDeadline,
    compensationDescription: row.compensationDescription,
    compensationType: row.compensationType,
    confidentialityLevel: row.confidentialityLevel,
    domain: row.domain,
    durationWeeks: row.durationWeeks,
    eligibilitySummary: eligibilitySummary(eligibilityMap.get(row.internalId) ?? []),
    managingOrganization: row.managingOrganization,
    ownerOrganization: row.ownerOrganization,
    publicId: row.publicId,
    skills: skillMap.get(row.internalId) ?? [],
    slug: row.slug ?? row.publicId,
    startDate: row.startDate,
    status: row.status,
    subtype: row.subtype,
    summary: row.summary,
    teamSizeMax: row.teamSizeMax,
    teamSizeMin: row.teamSizeMin,
    title: row.title,
    visibility: row.visibility,
    weeklyHours: row.weeklyHours,
    workMode: row.workMode,
  };
}

export async function listPublishedChallenges(
  options: ListPublishedChallengesOptions = {}
): Promise<PublishedChallengePage> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);

  const { rows, total } = await selectBaseChallengeRows({
    filters: options.filters,
    page,
    pageSize,
    sort: options.sort,
  });

  const challengeIds = rows.map((row) => row.internalId);
  const [skillMap, eligibilityMap] = await Promise.all([
    selectSkills(challengeIds),
    selectEligibilityRules(challengeIds),
  ]);
  const totalPages = Math.ceil(total / pageSize);

  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    items: rows.map((row) => mapListItem(row, skillMap, eligibilityMap)),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function getPublishedChallengeBySlug(
  slug: string
): Promise<ChallengeDetail | null> {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return null;

  const row = await selectBaseChallengeRowBySlug(trimmedSlug);
  if (!row) return null;

  const [
    skillMap,
    eligibilityMap,
    facultyAssignments,
    contactPerson,
    assessmentSummary,
  ] = await Promise.all([
    selectSkills([row.internalId]),
    selectEligibilityRules([row.internalId]),
    selectFacultyAssignments(row.internalId),
    selectContactPerson(row.internalId),
    getChallengeAssessmentSummary(row.internalId),
  ]);
  const eligibilityRows = eligibilityMap.get(row.internalId) ?? [];

  return {
    ...mapListItem(row, skillMap, eligibilityMap),
    assessmentSummary,
    contactPerson,
    description: row.description,
    eligibilityRules: eligibilityRows.map((rule) => ({
      config: toEligibilityConfig(rule.ruleType, rule.config),
      required: rule.required ?? true,
      ruleType: rule.ruleType,
    })),
    expectedDeliverables: row.expectedDeliverables,
    fullBrief: row.fullBrief,
    interviewFormat: row.interviewFormat,
    facultyAssignments,
  };
}

/**
 * Canonical names of the skills a student has on file, for matching against a
 * challenge's requirements. Only normalized rows participate: a `rawSkillName`
 * with no `skillId` has not been reconciled against the taxonomy yet, and
 * matching on it would claim a match the platform cannot stand behind.
 */
export async function listStudentSkillNames(
  studentId: bigint
): Promise<string[]> {
  const rows = await db
    .select({ canonicalName: skills.canonicalName })
    .from(studentSkills)
    .innerJoin(skills, eq(skills.id, studentSkills.skillId))
    .where(eq(studentSkills.studentId, studentId))
    .orderBy(asc(skills.canonicalName));

  return rows.map((row) => row.canonicalName);
}

/**
 * The student facts `evaluateChallengeEligibility` needs, in the shape it
 * expects. `activeProjectCount` counts projects that are still running, which
 * is what the MAX_ACTIVE_PROJECTS rule caps.
 */
export async function getStudentEligibilityProfile(
  studentUserId: bigint
): Promise<StudentEligibilityProfileRead | null> {
  const [profile] = await db
    .select({
      availableHoursPerWeek: studentProfiles.availableHoursPerWeek,
      gpa: studentProfiles.gpa,
      gpaScale: studentProfiles.gpaScale,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentUserId));

  if (!profile) return null;

  const [activeProjects] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(
      and(
        eq(projectMembers.studentId, studentUserId),
        inArray(projects.status, ["ACTIVE", "PAUSED", "FINAL_REVIEW"])
      )
    );

  return {
    activeProjectCount: activeProjects?.value ?? 0,
    availableHoursPerWeek: profile.availableHoursPerWeek,
    gpa: numericOrNull(profile.gpa),
    gpaScale: numericOrNull(profile.gpaScale),
    major: profile.major,
    school: profile.school,
    studyYear: profile.studyYear,
  };
}

function numericOrNull(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The facts a student needs before applying: what shape the assessment takes
 * and how long it runs. Derived from the active assessment's questions rather
 * than stored on the challenge, so it cannot disagree with what they actually
 * sit. Null when the challenge has no active assessment yet.
 */
export async function getChallengeAssessmentSummary(
  challengeId: InternalChallengeId
): Promise<ChallengeAssessmentSummaryRead | null> {
  const rows = await db
    .select({
      questionType: assessmentQuestions.questionType,
      timeLimitMinutes: assessments.timeLimitMinutes,
    })
    .from(assessments)
    .leftJoin(
      assessmentSections,
      eq(assessmentSections.assessmentId, assessments.id)
    )
    .leftJoin(
      assessmentQuestions,
      eq(assessmentQuestions.sectionId, assessmentSections.id)
    )
    .where(
      and(eq(assessments.challengeId, challengeId), eq(assessments.status, "ACTIVE"))
    );

  if (rows.length === 0) return null;

  const questionTypes = rows
    .map((row) => row.questionType)
    .filter((type): type is NonNullable<typeof type> => type !== null);

  return {
    timeLimitMinutes: rows[0].timeLimitMinutes,
    trackLabel: assessmentTrackLabel(questionTypes),
  };
}
