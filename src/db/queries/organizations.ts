import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationMemberships, organizations } from "@/db/schema";

export type OrganizationQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface OwnMembershipRead {
  jobTitle: string | null;
  membershipId: bigint;
  organizationId: bigint;
  organizationName: string;
  role: (typeof organizationMemberships.$inferSelect)["role"];
}

/**
 * The actor's own active memberships of one organization type — the same
 * shape backs both `/partner/profile` (EXTERNAL_PARTNER) and
 * `/review/profile` (INTERNAL_UNIT); org name/role are the organization's own
 * facts and stay read-only, `jobTitle` is the member's.
 */
export async function getOwnMembershipProfile(
  database: OrganizationQueryDatabase,
  userId: bigint,
  organizationType: (typeof organizations.$inferSelect)["organizationType"]
): Promise<OwnMembershipRead[]> {
  return database
    .select({
      jobTitle: organizationMemberships.jobTitle,
      membershipId: organizationMemberships.id,
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "ACTIVE"),
        eq(organizations.organizationType, organizationType)
      )
    );
}
