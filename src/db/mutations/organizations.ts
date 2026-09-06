import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationMemberships } from "@/db/schema";

export type OrganizationMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes the one self-reported field on a membership row.
 *
 * The `WHERE` clause pins both the membership id AND the owning user, so a
 * forged `membershipId` can never touch another member's row even before the
 * service-layer ownership check that calls this.
 */
export async function updateOwnMembershipJobTitle(
  database: OrganizationMutationDatabase,
  membershipId: bigint,
  userId: bigint,
  jobTitle: string | null
): Promise<void> {
  await database
    .update(organizationMemberships)
    .set({ jobTitle, updatedAt: new Date() })
    .where(
      and(
        eq(organizationMemberships.id, membershipId),
        eq(organizationMemberships.userId, userId)
      )
    );
}
