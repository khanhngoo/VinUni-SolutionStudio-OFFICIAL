import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, exists, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentAttempts,
  assessments,
  auditLogs,
  challenges,
  facultyProfiles,
  milestones,
  offers,
  organizationMemberships,
  organizations,
  projectMembers,
  projects,
  selections,
  studentProfiles,
  userCredentials,
  userPlatformRoles,
  users,
} from "@/db/schema";
import type { AuditAction, AuditEntityType } from "@/services/audit.service";

/**
 * Phase 6.6 Checkpoint D global admin read models. Every function here
 * selects only approved metadata fields (Section 12 of
 * `context/admin-console-implementation-plan.md`), uses bounded pagination
 * with deterministic ordering, and batches related lookups by the returned
 * page's IDs instead of joining unboundedly or looping per row. Callers
 * (every `/admin` page/layout) are responsible for the
 * `requirePlatformOwner` authorization gate — these queries have none of
 * their own.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface AdminPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminStatusCount {
  status: string;
  count: number;
}

function normalizePage(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE;
  return Math.max(1, Math.floor(value ?? DEFAULT_PAGE));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value ?? DEFAULT_PAGE_SIZE)));
}

function toPage<T>(items: T[], total: number, page: number, pageSize: number): AdminPage<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** count(*) exists as its own tiny helper only because every list below needs it once. */
async function countRows(condition: ReturnType<typeof and> | undefined, table: Parameters<typeof db.select>[0] extends never ? never : Parameters<ReturnType<typeof db.select>["from"]>[0]) {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(table)
    .where(condition);
  return row?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Overview (Section 9.1)
// ---------------------------------------------------------------------------

export interface AdminOverview {
  users: {
    total: number;
    byStatus: AdminStatusCount[];
    capabilities: {
      student: number;
      faculty: number;
      partnerRepresentative: number;
      internalUnitMember: number;
      platformOwner: number;
      neutral: number;
    };
  };
  organizations: {
    total: number;
    byType: AdminStatusCount[];
    byVerificationStatus: AdminStatusCount[];
  };
  challenges: { total: number; byStatus: AdminStatusCount[] };
  applications: { total: number; byStatus: AdminStatusCount[] };
  projects: { total: number; byStatus: AdminStatusCount[] };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [
    usersTotal,
    usersByStatus,
    studentCount,
    facultyCount,
    partnerCount,
    internalUnitCount,
    platformOwnerCount,
    neutralCount,
    organizationsTotal,
    organizationsByType,
    organizationsByVerificationStatus,
    challengesTotal,
    challengesByStatus,
    applicationsTotal,
    applicationsByStatus,
    projectsTotal,
    projectsByStatus,
  ] = await Promise.all([
    countRows(undefined, users),
    groupByCount(users, users.status),
    countRows(exists(existsBy(studentProfiles, studentProfiles.userId, users.id)), users),
    countRows(exists(existsBy(facultyProfiles, facultyProfiles.userId, users.id)), users),
    countRows(exists(activeMembershipOfType("EXTERNAL_PARTNER")), users),
    countRows(exists(activeMembershipOfType("INTERNAL_UNIT")), users),
    countRows(
      exists(
        db
          .select({ one: sql`1` })
          .from(userPlatformRoles)
          .where(
            and(
              eq(userPlatformRoles.userId, users.id),
              eq(userPlatformRoles.role, "PLATFORM_OWNER"),
              eq(userPlatformRoles.status, "ACTIVE")
            )
          )
      ),
      users
    ),
    countRows(
      and(
        sql`NOT ${exists(existsBy(studentProfiles, studentProfiles.userId, users.id))}`,
        sql`NOT ${exists(existsBy(facultyProfiles, facultyProfiles.userId, users.id))}`,
        sql`NOT ${exists(activeMembershipOfType("EXTERNAL_PARTNER"))}`,
        sql`NOT ${exists(activeMembershipOfType("INTERNAL_UNIT"))}`
      ),
      users
    ),
    countRows(undefined, organizations),
    groupByCount(organizations, organizations.organizationType),
    groupByCount(organizations, organizations.verificationStatus),
    countRows(undefined, challenges),
    groupByCount(challenges, challenges.status),
    countRows(undefined, applications),
    groupByCount(applications, applications.status),
    countRows(undefined, projects),
    groupByCount(projects, projects.status),
  ]);

  return {
    users: {
      total: usersTotal,
      byStatus: usersByStatus,
      capabilities: {
        student: studentCount,
        faculty: facultyCount,
        partnerRepresentative: partnerCount,
        internalUnitMember: internalUnitCount,
        platformOwner: platformOwnerCount,
        neutral: neutralCount,
      },
    },
    organizations: {
      total: organizationsTotal,
      byType: organizationsByType,
      byVerificationStatus: organizationsByVerificationStatus,
    },
    challenges: { total: challengesTotal, byStatus: challengesByStatus },
    applications: { total: applicationsTotal, byStatus: applicationsByStatus },
    projects: { total: projectsTotal, byStatus: projectsByStatus },
  };
}

export interface AdminAttentionItems {
  /** Definition: status IN (SUBMITTED, UNDER_REVIEW) and unchanged for 7+ days (Section 9.1). */
  staleReviewChallenges: number;
  /** Definition: status = APPLICATIONS_OPEN with an application deadline already in the past. */
  expiredOpenChallenges: number;
  /** Definition: offer status = PENDING with respondBy already in the past. */
  overduePendingOffers: number;
}

/**
 * "Failed or incomplete flows detectable from durable database state"
 * (Section 9.1) — three bounded, set-based counts derived from existing
 * columns and documented invariants, never an invented "health" score.
 * `/admin` (the overview) is the one caller, per Section 14.2 ("lead with
 * workflow state and attention items").
 */
export async function getAdminAttentionItems(): Promise<AdminAttentionItems> {
  const [staleReviewChallenges, expiredOpenChallenges, overduePendingOffers] = await Promise.all([
    countRows(
      and(
        inArray(challenges.status, ["SUBMITTED", "UNDER_REVIEW"]),
        sql`${challenges.updatedAt} < now() - interval '7 days'`
      ),
      challenges
    ),
    countRows(
      and(eq(challenges.status, "APPLICATIONS_OPEN"), sql`${challenges.applicationDeadline} < now()`),
      challenges
    ),
    countRows(and(eq(offers.status, "PENDING"), sql`${offers.respondBy} < now()`), offers),
  ]);

  return { staleReviewChallenges, expiredOpenChallenges, overduePendingOffers };
}

export interface AdminSystemStatus {
  applicationVersion: string;
  serverTime: Date;
  environmentLabel: string;
  databaseConnected: boolean;
  latestMigration: { tag: string | null; appliedAt: Date | null } | null;
  developmentAuthenticationEnabled: boolean;
}

/**
 * Section 9.6's approved field list only: application version, server time,
 * environment label, live database connectivity, the latest *applied*
 * migration (read from `drizzle.__drizzle_migrations`, the database's own
 * record — not the on-disk journal, which reflects what's generated, not
 * necessarily what this database instance actually ran), and one non-secret
 * feature flag. Never environment-variable values, connection strings,
 * secrets, tokens, or raw logs.
 */
export async function getAdminSystemStatus(): Promise<AdminSystemStatus> {
  const { isDevelopmentAuthenticationEnabled } = await import("@/auth/development-identities");
  const packageJson = (await import("../../../package.json")) as { version?: string };

  let databaseConnected = false;
  try {
    await db.execute(sql`select 1`);
    databaseConnected = true;
  } catch {
    databaseConnected = false;
  }

  let latestMigration: AdminSystemStatus["latestMigration"] = null;
  try {
    const result = await db.execute<{ created_at: string }>(
      sql`select created_at from drizzle.__drizzle_migrations order by id desc limit 1`
    );
    const row = result.rows[0];
    if (row) {
      const appliedAt = new Date(Number(row.created_at));
      const tag = await findJournalTagByTimestamp(Number(row.created_at));
      latestMigration = { tag, appliedAt };
    }
  } catch {
    latestMigration = null;
  }

  return {
    applicationVersion: packageJson.version ?? "unknown",
    serverTime: new Date(),
    environmentLabel: process.env.NODE_ENV ?? "unknown",
    databaseConnected,
    latestMigration,
    developmentAuthenticationEnabled: isDevelopmentAuthenticationEnabled(),
  };
}

async function findJournalTagByTimestamp(when: number): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8");
    const journal = JSON.parse(raw) as { entries: Array<{ tag: string; when: number }> };
    return journal.entries.find((entry) => entry.when === when)?.tag ?? null;
  } catch {
    return null;
  }
}

function existsBy<T extends { userId: unknown }>(
  table: T,
  column: T["userId"],
  matches: typeof users.id
) {
  return db
    .select({ one: sql`1` })
    .from(table as never)
    .where(eq(column as never, matches));
}

function activeMembershipOfType(organizationType: "EXTERNAL_PARTNER" | "INTERNAL_UNIT") {
  return db
    .select({ one: sql`1` })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.userId, users.id),
        eq(organizationMemberships.status, "ACTIVE"),
        eq(organizations.organizationType, organizationType)
      )
    );
}

async function groupByCount<TColumn extends { name: string }>(
  table: Parameters<ReturnType<typeof db.select>["from"]>[0],
  column: TColumn
): Promise<AdminStatusCount[]> {
  const rows = await db
    .select({ status: column as never, count: sql<number>`count(*)::int` })
    .from(table)
    .groupBy(column as never)
    .orderBy(column as never);
  return (rows as Array<{ status: string | null; count: number }>).map((row) => ({
    status: row.status ?? "UNKNOWN",
    count: row.count,
  }));
}

// ---------------------------------------------------------------------------
// Users (Section 9.3)
// ---------------------------------------------------------------------------

export type AdminUserCapabilityFilter =
  | "STUDENT"
  | "FACULTY"
  | "PARTNER_REPRESENTATIVE"
  | "INTERNAL_UNIT_MEMBER"
  | "PLATFORM_OWNER";

export interface ListAdminUsersOptions {
  page?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  capability?: AdminUserCapabilityFilter;
}

export interface AdminUserListItem {
  id: bigint;
  fullName: string;
  email: string;
  status: string | null;
  hasCredential: boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isPartnerRepresentative: boolean;
  isInternalUnitMember: boolean;
  isPlatformOwner: boolean;
  createdAt: Date | null;
}

export async function listAdminUsers(
  options: ListAdminUsersOptions = {}
): Promise<AdminPage<AdminUserListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);

  const conditions = [
    options.status ? eq(users.status, options.status) : undefined,
    options.capability ? userCapabilityCondition(options.capability) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({ id: users.id, fullName: users.fullName, email: users.email, status: users.status, createdAt: users.createdAt })
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, users),
  ]);

  const ids = rows.map((row) => row.id);
  const [credentialIds, studentIds, facultyIds, memberships, platformOwnerIds] = await Promise.all([
    idSet(userCredentials.userId, ids, userCredentials),
    idSet(studentProfiles.userId, ids, studentProfiles),
    idSet(facultyProfiles.userId, ids, facultyProfiles),
    ids.length === 0
      ? []
      : db
          .select({ userId: organizationMemberships.userId, organizationType: organizations.organizationType })
          .from(organizationMemberships)
          .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
          .where(and(inArray(organizationMemberships.userId, ids), eq(organizationMemberships.status, "ACTIVE"))),
    ids.length === 0
      ? []
      : db
          .select({ userId: userPlatformRoles.userId })
          .from(userPlatformRoles)
          .where(
            and(
              inArray(userPlatformRoles.userId, ids),
              eq(userPlatformRoles.role, "PLATFORM_OWNER"),
              eq(userPlatformRoles.status, "ACTIVE")
            )
          ),
  ]);

  const partnerIds = new Set(memberships.filter((m) => m.organizationType === "EXTERNAL_PARTNER").map((m) => m.userId));
  const internalUnitIds = new Set(memberships.filter((m) => m.organizationType === "INTERNAL_UNIT").map((m) => m.userId));
  const platformOwnerSet = new Set(platformOwnerIds.map((row) => row.userId));

  const items: AdminUserListItem[] = rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt,
    hasCredential: credentialIds.has(row.id),
    isStudent: studentIds.has(row.id),
    isFaculty: facultyIds.has(row.id),
    isPartnerRepresentative: partnerIds.has(row.id),
    isInternalUnitMember: internalUnitIds.has(row.id),
    isPlatformOwner: platformOwnerSet.has(row.id),
  }));

  return toPage(items, total, page, pageSize);
}

function userCapabilityCondition(capability: AdminUserCapabilityFilter) {
  switch (capability) {
    case "STUDENT":
      return exists(existsBy(studentProfiles, studentProfiles.userId, users.id));
    case "FACULTY":
      return exists(existsBy(facultyProfiles, facultyProfiles.userId, users.id));
    case "PARTNER_REPRESENTATIVE":
      return exists(activeMembershipOfType("EXTERNAL_PARTNER"));
    case "INTERNAL_UNIT_MEMBER":
      return exists(activeMembershipOfType("INTERNAL_UNIT"));
    case "PLATFORM_OWNER":
      return exists(
        db
          .select({ one: sql`1` })
          .from(userPlatformRoles)
          .where(
            and(
              eq(userPlatformRoles.userId, users.id),
              eq(userPlatformRoles.role, "PLATFORM_OWNER"),
              eq(userPlatformRoles.status, "ACTIVE")
            )
          )
      );
  }
}

async function idSet<T extends { name: string }>(
  column: T,
  ids: bigint[],
  table: Parameters<ReturnType<typeof db.select>["from"]>[0]
): Promise<Set<bigint>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: column as never })
    .from(table)
    .where(inArray(column as never, ids));
  return new Set((rows as Array<{ id: bigint }>).map((row) => row.id));
}

export interface AdminUserDetail {
  id: bigint;
  fullName: string;
  email: string;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  hasCredential: boolean;
  studentProfile: { school: string | null; major: string | null; studyYear: number | null } | null;
  facultyProfile: { school: string | null; department: string | null; academicTitle: string | null } | null;
  memberships: Array<{
    organizationId: bigint;
    organizationName: string;
    organizationType: string;
    role: string;
    status: string | null;
  }>;
  platformRole: { role: string; status: string; grantedAt: Date | null } | null;
  recentAuditEvents: AdminPage<AdminAuditEventListItem>;
}

/**
 * The Checkpoint F detail read (Section 9.3): identity, authentication
 * method/credential presence, student/faculty profile, organization
 * memberships, and global platform role kept as distinct fields — never
 * collapsed into one editable "role" — plus this user's own recent audit
 * events (Section 11.3's `entityType: "user"` rows). `/admin/users/[userId]`
 * is the one caller; a platform owner's mutation authority for this user
 * (suspend/reactivate) lives in `platform-admin.service.ts`, not here.
 */
export async function getAdminUserDetail(userId: bigint): Promise<AdminUserDetail | null> {
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [credentialRows, studentRows, facultyRows, membershipRows, platformRoleRows, recentAuditEvents] =
    await Promise.all([
      db
        .select({ userId: userCredentials.userId })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId))
        .limit(1),
      db
        .select({ school: studentProfiles.school, major: studentProfiles.major, studyYear: studentProfiles.studyYear })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1),
      db
        .select({
          school: facultyProfiles.school,
          department: facultyProfiles.department,
          academicTitle: facultyProfiles.academicTitle,
        })
        .from(facultyProfiles)
        .where(eq(facultyProfiles.userId, userId))
        .limit(1),
      db
        .select({
          organizationId: organizationMemberships.organizationId,
          organizationName: organizations.name,
          organizationType: organizations.organizationType,
          role: organizationMemberships.role,
          status: organizationMemberships.status,
        })
        .from(organizationMemberships)
        .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
        .where(eq(organizationMemberships.userId, userId)),
      db
        .select({
          role: userPlatformRoles.role,
          status: userPlatformRoles.status,
          grantedAt: userPlatformRoles.grantedAt,
        })
        .from(userPlatformRoles)
        .where(and(eq(userPlatformRoles.userId, userId), eq(userPlatformRoles.role, "PLATFORM_OWNER")))
        .orderBy(desc(userPlatformRoles.id))
        .limit(1),
      listAdminAuditEvents({ entityType: "user", entityId: userId, page: 1 }),
    ]);

  return {
    ...user,
    hasCredential: credentialRows.length > 0,
    studentProfile: studentRows[0] ?? null,
    facultyProfile: facultyRows[0] ?? null,
    memberships: membershipRows,
    platformRole: platformRoleRows[0] ?? null,
    recentAuditEvents,
  };
}

// ---------------------------------------------------------------------------
// Organizations (Section 9.4)
// ---------------------------------------------------------------------------

export interface ListAdminOrganizationsOptions {
  page?: number;
  organizationType?: "INTERNAL_UNIT" | "EXTERNAL_PARTNER";
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
}

export interface AdminOrganizationListItem {
  id: bigint;
  name: string;
  organizationType: string | null;
  verificationStatus: string | null;
  membershipCount: number;
  createdAt: Date | null;
}

export async function listAdminOrganizations(
  options: ListAdminOrganizationsOptions = {}
): Promise<AdminPage<AdminOrganizationListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);

  const conditions = [
    options.organizationType ? eq(organizations.organizationType, options.organizationType) : undefined,
    options.verificationStatus ? eq(organizations.verificationStatus, options.verificationStatus) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        organizationType: organizations.organizationType,
        verificationStatus: organizations.verificationStatus,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(where)
      .orderBy(desc(organizations.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, organizations),
  ]);

  const ids = rows.map((row) => row.id);
  const membershipCounts =
    ids.length === 0
      ? []
      : await db
          .select({ organizationId: organizationMemberships.organizationId, count: sql<number>`count(*)::int` })
          .from(organizationMemberships)
          .where(and(inArray(organizationMemberships.organizationId, ids), eq(organizationMemberships.status, "ACTIVE")))
          .groupBy(organizationMemberships.organizationId);
  const countByOrg = new Map(membershipCounts.map((row) => [row.organizationId, row.count]));

  const items: AdminOrganizationListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    organizationType: row.organizationType,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt,
    membershipCount: countByOrg.get(row.id) ?? 0,
  }));

  return toPage(items, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Challenges (Section 9.5)
// ---------------------------------------------------------------------------

export interface ListAdminChallengesOptions {
  page?: number;
  status?: (typeof challenges.status.enumValues)[number];
}

export interface AdminChallengeListItem {
  id: bigint;
  publicId: string;
  slug: string | null;
  title: string;
  status: string | null;
  visibility: string | null;
  confidentialityLevel: string | null;
  ownerOrganizationName: string;
  managingOrganizationName: string;
  applicationDeadline: Date | null;
  applicationCount: number;
}

export async function listAdminChallenges(
  options: ListAdminChallengesOptions = {}
): Promise<AdminPage<AdminChallengeListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);
  const where = options.status ? eq(challenges.status, options.status) : undefined;

  const ownerOrg = alias(organizations, "owner_organization");
  const managingOrg = alias(organizations, "managing_organization");

  const [rows, total] = await Promise.all([
    db
      .select({
        id: challenges.id,
        publicId: challenges.publicId,
        slug: challenges.slug,
        title: challenges.title,
        status: challenges.status,
        visibility: challenges.visibility,
        confidentialityLevel: challenges.confidentialityLevel,
        ownerOrganizationName: ownerOrg.name,
        managingOrganizationName: managingOrg.name,
        applicationDeadline: challenges.applicationDeadline,
      })
      .from(challenges)
      .innerJoin(ownerOrg, eq(ownerOrg.id, challenges.ownerOrganizationId))
      .innerJoin(managingOrg, eq(managingOrg.id, challenges.managingOrganizationId))
      .where(where)
      .orderBy(desc(challenges.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, challenges),
  ]);

  const ids = rows.map((row) => row.id);
  const applicationCounts =
    ids.length === 0
      ? []
      : await db
          .select({ challengeId: applications.challengeId, count: sql<number>`count(*)::int` })
          .from(applications)
          .where(inArray(applications.challengeId, ids))
          .groupBy(applications.challengeId);
  const countByChallenge = new Map(applicationCounts.map((row) => [row.challengeId, row.count]));

  const items: AdminChallengeListItem[] = rows.map((row) => ({
    ...row,
    applicationCount: countByChallenge.get(row.id) ?? 0,
  }));

  return toPage(items, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Applications (Section 9.5)
// ---------------------------------------------------------------------------

export interface ListAdminApplicationsOptions {
  page?: number;
  status?: (typeof applications.status.enumValues)[number];
}

export interface AdminApplicationListItem {
  id: bigint;
  publicId: string;
  status: string | null;
  challengeTitle: string;
  challengePublicId: string;
  leaderName: string | null;
  submittedAt: Date | null;
}

export async function listAdminApplications(
  options: ListAdminApplicationsOptions = {}
): Promise<AdminPage<AdminApplicationListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);
  const where = options.status ? eq(applications.status, options.status) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: applications.id,
        publicId: applications.publicId,
        status: applications.status,
        submittedAt: applications.submittedAt,
        challengeTitle: challenges.title,
        challengePublicId: challenges.publicId,
      })
      .from(applications)
      .innerJoin(challenges, eq(challenges.id, applications.challengeId))
      .where(where)
      .orderBy(desc(applications.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, applications),
  ]);

  const ids = rows.map((row) => row.id);
  const leaders =
    ids.length === 0
      ? []
      : await db
          .select({ applicationId: applicationMembers.applicationId, fullName: users.fullName })
          .from(applicationMembers)
          .innerJoin(studentProfiles, eq(studentProfiles.userId, applicationMembers.studentId))
          .innerJoin(users, eq(users.id, studentProfiles.userId))
          .where(and(inArray(applicationMembers.applicationId, ids), eq(applicationMembers.memberRole, "LEADER")));
  const leaderByApplication = new Map(leaders.map((row) => [row.applicationId, row.fullName]));

  const items: AdminApplicationListItem[] = rows.map((row) => ({
    ...row,
    leaderName: leaderByApplication.get(row.id) ?? null,
  }));

  return toPage(items, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Assessments and offers (Section 9.5) — Checkpoint G
// ---------------------------------------------------------------------------

export interface ListAdminAssessmentAttemptsOptions {
  page?: number;
  status?: (typeof assessmentAttempts.status.enumValues)[number];
}

export interface AdminAssessmentAttemptListItem {
  id: bigint;
  status: string | null;
  assessmentTitle: string | null;
  challengeTitle: string;
  applicationPublicId: string;
  startedAt: Date | null;
  submittedAt: Date | null;
}

/**
 * `assessment_attempts` is the actual per-application workflow entity
 * (status, timestamps); `assessments` (joined here for `title`) is the
 * challenge-owned assessment definition, not a workflow instance itself —
 * mirroring the plan's own distinction between domain definitions and
 * workflow state (Section 9.5).
 */
export async function listAdminAssessmentAttempts(
  options: ListAdminAssessmentAttemptsOptions = {}
): Promise<AdminPage<AdminAssessmentAttemptListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);
  const where = options.status ? eq(assessmentAttempts.status, options.status) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: assessmentAttempts.id,
        status: assessmentAttempts.status,
        startedAt: assessmentAttempts.startedAt,
        submittedAt: assessmentAttempts.submittedAt,
        assessmentTitle: assessments.title,
        challengeTitle: challenges.title,
        applicationPublicId: applications.publicId,
      })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
      .innerJoin(challenges, eq(challenges.id, assessments.challengeId))
      .innerJoin(applications, eq(applications.id, assessmentAttempts.applicationId))
      .where(where)
      .orderBy(desc(assessmentAttempts.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, assessmentAttempts),
  ]);

  return toPage(rows, total, page, pageSize);
}

export interface ListAdminOffersOptions {
  page?: number;
  status?: (typeof offers.status.enumValues)[number];
}

export interface AdminOfferListItem {
  id: bigint;
  status: string | null;
  challengeTitle: string;
  applicationPublicId: string;
  respondBy: Date | null;
  createdAt: Date | null;
  respondedAt: Date | null;
}

export async function listAdminOffers(
  options: ListAdminOffersOptions = {}
): Promise<AdminPage<AdminOfferListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);
  const where = options.status ? eq(offers.status, options.status) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: offers.id,
        status: offers.status,
        respondBy: offers.respondBy,
        createdAt: offers.createdAt,
        respondedAt: offers.respondedAt,
        challengeTitle: challenges.title,
        applicationPublicId: applications.publicId,
      })
      .from(offers)
      .innerJoin(selections, eq(selections.id, offers.selectionId))
      .innerJoin(applications, eq(applications.id, selections.applicationId))
      .innerJoin(challenges, eq(challenges.id, applications.challengeId))
      .where(where)
      .orderBy(desc(offers.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, offers),
  ]);

  return toPage(rows, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Projects (Section 9.5)
// ---------------------------------------------------------------------------

export interface ListAdminProjectsOptions {
  page?: number;
  status?: (typeof projects.status.enumValues)[number];
}

export interface AdminProjectListItem {
  id: bigint;
  publicId: string;
  status: string | null;
  challengeTitle: string;
  facultySupervisorName: string | null;
  memberCount: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  createdAt: Date | null;
}

export async function listAdminProjects(
  options: ListAdminProjectsOptions = {}
): Promise<AdminPage<AdminProjectListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);
  const where = options.status ? eq(projects.status, options.status) : undefined;

  const facultyUser = alias(users, "faculty_user");

  const [rows, total] = await Promise.all([
    db
      .select({
        id: projects.id,
        publicId: projects.publicId,
        status: projects.status,
        createdAt: projects.createdAt,
        challengeTitle: challenges.title,
        facultySupervisorName: facultyUser.fullName,
      })
      .from(projects)
      .innerJoin(applications, eq(applications.id, projects.applicationId))
      .innerJoin(challenges, eq(challenges.id, applications.challengeId))
      .leftJoin(facultyProfiles, eq(facultyProfiles.userId, projects.facultySupervisorId))
      .leftJoin(facultyUser, eq(facultyUser.id, facultyProfiles.userId))
      .where(where)
      .orderBy(desc(projects.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, projects),
  ]);

  const ids = rows.map((row) => row.id);
  const [memberCounts, milestoneCounts] = await Promise.all([
    ids.length === 0
      ? []
      : db
          .select({ projectId: projectMembers.projectId, count: sql<number>`count(*)::int` })
          .from(projectMembers)
          .where(inArray(projectMembers.projectId, ids))
          .groupBy(projectMembers.projectId),
    ids.length === 0
      ? []
      : db
          .select({
            projectId: milestones.projectId,
            status: milestones.status,
            count: sql<number>`count(*)::int`,
          })
          .from(milestones)
          .where(inArray(milestones.projectId, ids))
          .groupBy(milestones.projectId, milestones.status),
  ]);
  const memberCountByProject = new Map(memberCounts.map((row) => [row.projectId, row.count]));
  const milestoneTotalsByProject = new Map<bigint, { completed: number; total: number }>();
  for (const row of milestoneCounts) {
    const existing = milestoneTotalsByProject.get(row.projectId) ?? { completed: 0, total: 0 };
    existing.total += row.count;
    if (row.status === "COMPLETED") existing.completed += row.count;
    milestoneTotalsByProject.set(row.projectId, existing);
  }

  const items: AdminProjectListItem[] = rows.map((row) => {
    const milestoneTotals = milestoneTotalsByProject.get(row.id) ?? { completed: 0, total: 0 };
    return {
      ...row,
      memberCount: memberCountByProject.get(row.id) ?? 0,
      milestonesCompleted: milestoneTotals.completed,
      milestonesTotal: milestoneTotals.total,
    };
  });

  return toPage(items, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Activity and audit (Section 9.2, Section 11) — Checkpoint E
//
// `/admin/activity` and `/admin/audit` are two presentations of the same
// underlying `audit_logs` table: the former a plain recent-first feed, the
// latter the same rows with the full filter set exposed. Coverage begins
// 2026-09-09 — rows only exist for mutations instrumented from that date
// forward (Checkpoint E). Absence of a row is not proof an action never
// happened before instrumentation (Section 9.1/9.2).
// ---------------------------------------------------------------------------

export interface ListAdminAuditEventsOptions {
  page?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: bigint;
  actorUserId?: bigint;
}

export interface AdminAuditEventListItem {
  id: bigint;
  action: string;
  entityType: string | null;
  entityId: bigint | null;
  details: unknown;
  createdAt: Date | null;
  actorUserId: bigint | null;
  actorName: string | null;
}

export async function listAdminAuditEvents(
  options: ListAdminAuditEventsOptions = {}
): Promise<AdminPage<AdminAuditEventListItem>> {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(DEFAULT_PAGE_SIZE);

  const conditions = [
    options.action ? eq(auditLogs.action, options.action) : undefined,
    options.entityType ? eq(auditLogs.entityType, options.entityType) : undefined,
    options.entityId !== undefined ? eq(auditLogs.entityId, options.entityId) : undefined,
    options.actorUserId !== undefined ? eq(auditLogs.userId, options.actorUserId) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        actorUserId: auditLogs.userId,
        actorName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(where)
      .orderBy(desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countRows(where, auditLogs),
  ]);

  return toPage(rows, total, page, pageSize);
}

// ---------------------------------------------------------------------------
// Access (Section 8, `/admin/access`) — Checkpoint F
// ---------------------------------------------------------------------------

export interface AdminPlatformOwnerListItem {
  platformRoleId: bigint;
  userId: bigint;
  fullName: string;
  email: string;
  grantedAt: Date | null;
  grantedByName: string | null;
}

/**
 * Every ACTIVE `PLATFORM_OWNER` assignment. Unpaginated: the last-owner
 * invariant enforced by `platform-admin.service.ts` keeps this set small by
 * construction (a handful of recovery-capable owners, not an open-ended
 * list), so ordinary pagination would be a needless complication here.
 */
export async function listAdminPlatformOwners(): Promise<AdminPlatformOwnerListItem[]> {
  const grantedByUser = alias(users, "granted_by_user");

  return db
    .select({
      platformRoleId: userPlatformRoles.id,
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      grantedAt: userPlatformRoles.grantedAt,
      grantedByName: grantedByUser.fullName,
    })
    .from(userPlatformRoles)
    .innerJoin(users, eq(users.id, userPlatformRoles.userId))
    .leftJoin(grantedByUser, eq(grantedByUser.id, userPlatformRoles.grantedBy))
    .where(and(eq(userPlatformRoles.role, "PLATFORM_OWNER"), eq(userPlatformRoles.status, "ACTIVE")))
    .orderBy(desc(userPlatformRoles.id));
}
