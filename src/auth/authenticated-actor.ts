import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  facultyProfiles,
  organizationMemberships,
  organizations,
  studentProfiles,
  userPlatformRoles,
} from "@/db/schema";

import {
  AuthenticatedUserError,
  getAuthenticatedUser,
  type AuthenticatedUser,
  type AuthenticatedUserResolution,
} from "./authenticated-user";

type OrganizationType = NonNullable<
  typeof organizations.$inferSelect["organizationType"]
>;
type OrganizationMembershipRole = typeof organizationMemberships.$inferSelect["role"];
type PlatformRole = typeof userPlatformRoles.$inferSelect["role"];

export type AuthenticatedActorCapability =
  | "STUDENT"
  | "FACULTY"
  | "PARTNER_REPRESENTATIVE"
  | "INTERNAL_UNIT_MEMBER"
  | "PLATFORM_OWNER";

export interface AuthenticatedActorMembership {
  membershipId: bigint;
  organizationId: bigint;
  organizationType: OrganizationType;
  role: OrganizationMembershipRole;
}

/**
 * Phase 6.6 global platform authority. Distinct from `memberships` above:
 * an organization ADMIN never implies a platform role, and the inverse is
 * also true. Only ACTIVE rows are resolved here.
 */
export interface AuthenticatedActorPlatformRole {
  platformRoleId: bigint;
  role: PlatformRole;
}

export interface AuthenticatedActor {
  capabilities: ReadonlySet<AuthenticatedActorCapability>;
  facultyProfile: { userId: bigint } | null;
  memberships: readonly AuthenticatedActorMembership[];
  platformRoles: readonly AuthenticatedActorPlatformRole[];
  studentProfile: { userId: bigint } | null;
  user: AuthenticatedUser;
}

export type AuthenticatedActorResolution =
  | Exclude<AuthenticatedUserResolution, { status: "RESOLVED" }>
  | { status: "RESOLVED"; actor: AuthenticatedActor };

/**
 * Resolves all role dimensions from PostgreSQL for an already-authenticated,
 * active internal user. It deliberately reads no session claims beyond the
 * Phase 6.1 identity primitive and performs no writes.
 */
export async function resolveAuthenticatedActor(
  user: AuthenticatedUser
): Promise<AuthenticatedActor> {
  const [studentProfile, facultyProfile, rows, platformRoleRows] = await Promise.all([
    db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.userId))
      .limit(1),
    db
      .select({ userId: facultyProfiles.userId })
      .from(facultyProfiles)
      .where(eq(facultyProfiles.userId, user.userId))
      .limit(1),
    db
      .select({
        membershipId: organizationMemberships.id,
        organizationId: organizations.id,
        organizationType: organizations.organizationType,
        role: organizationMemberships.role,
      })
      .from(organizationMemberships)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMemberships.organizationId)
      )
      .where(
        and(
          eq(organizationMemberships.userId, user.userId),
          eq(organizationMemberships.status, "ACTIVE")
        )
      ),
    db
      .select({ platformRoleId: userPlatformRoles.id, role: userPlatformRoles.role })
      .from(userPlatformRoles)
      .where(
        and(
          eq(userPlatformRoles.userId, user.userId),
          eq(userPlatformRoles.status, "ACTIVE")
        )
      ),
  ]);

  const memberships: AuthenticatedActorMembership[] = rows.map((row) => ({
    membershipId: row.membershipId,
    organizationId: row.organizationId,
    organizationType: row.organizationType,
    role: row.role,
  }));
  const platformRoles: AuthenticatedActorPlatformRole[] = platformRoleRows.map((row) => ({
    platformRoleId: row.platformRoleId,
    role: row.role,
  }));
  const capabilities = new Set<AuthenticatedActorCapability>();

  if (studentProfile[0]) capabilities.add("STUDENT");
  if (facultyProfile[0]) capabilities.add("FACULTY");
  if (memberships.some((membership) => membership.organizationType === "EXTERNAL_PARTNER")) {
    capabilities.add("PARTNER_REPRESENTATIVE");
  }
  if (memberships.some((membership) => membership.organizationType === "INTERNAL_UNIT")) {
    capabilities.add("INTERNAL_UNIT_MEMBER");
  }
  if (platformRoles.some((platformRole) => platformRole.role === "PLATFORM_OWNER")) {
    capabilities.add("PLATFORM_OWNER");
  }

  return {
    capabilities,
    facultyProfile: facultyProfile[0] ?? null,
    memberships,
    platformRoles,
    studentProfile: studentProfile[0] ?? null,
    user,
  };
}

export async function getAuthenticatedActor(): Promise<AuthenticatedActorResolution> {
  const resolution = await getAuthenticatedUser();
  if (resolution.status !== "RESOLVED") return resolution;

  return { status: "RESOLVED", actor: await resolveAuthenticatedActor(resolution.user) };
}

export async function requireAuthenticatedActor(): Promise<AuthenticatedActor> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") throw new AuthenticatedUserError(resolution.status);
  return resolution.actor;
}

export function hasActorCapability(
  actor: AuthenticatedActor,
  capability: AuthenticatedActorCapability
) {
  return actor.capabilities.has(capability);
}

/**
 * The caller supplies the authoritative organization ID from the protected
 * resource. This intentionally avoids global CAID/E-Lab labels and keeps
 * administrative authority scoped to that single organization.
 */
export function hasActiveOrganizationRole(
  actor: AuthenticatedActor,
  organizationId: bigint,
  role: OrganizationMembershipRole
) {
  return actor.memberships.some(
    (membership) =>
      membership.organizationId === organizationId && membership.role === role
  );
}

/**
 * Shared fact predicates for domain policies. Resource policies must provide
 * the organization ID taken from the resource; these helpers never infer a
 * scope from a name, route, or session claim.
 */
export function hasActiveOrganizationMembership(
  actor: AuthenticatedActor,
  organizationId: bigint
) {
  return actor.memberships.some(
    (membership) => membership.organizationId === organizationId
  );
}

export function hasOneOfActiveOrganizationRoles(
  actor: AuthenticatedActor,
  organizationId: bigint,
  roles: readonly OrganizationMembershipRole[]
) {
  return actor.memberships.some(
    (membership) =>
      membership.organizationId === organizationId && roles.includes(membership.role)
  );
}

export function hasOrganizationTypeMembership(
  actor: AuthenticatedActor,
  organizationType: OrganizationType
) {
  return actor.memberships.some(
    (membership) => membership.organizationType === organizationType
  );
}

export function isOrganizationAdmin(
  actor: AuthenticatedActor,
  organizationId: bigint
) {
  return hasActiveOrganizationRole(actor, organizationId, "ADMIN");
}
