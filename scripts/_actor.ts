import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { facultyProfiles, organizationMemberships, organizations, studentProfiles, users } from "../src/db/schema";
import type { AuthenticatedActor } from "../src/auth/authenticated-actor";

/**
 * Builds an actor for verification scripts, which have no HTTP session.
 * Mirrors resolveAuthenticatedActor: capabilities derive from profile and
 * membership rows, never from anything the caller asserts.
 */
export async function getAuthenticatedActorForVerification(email: string): Promise<AuthenticatedActor> {
  const [user] = await db.select({ email: users.email, fullName: users.fullName, userId: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`No seeded user ${email}`);

  const [student] = await db.select({ userId: studentProfiles.userId }).from(studentProfiles).where(eq(studentProfiles.userId, user.userId)).limit(1);
  const [faculty] = await db.select({ userId: facultyProfiles.userId }).from(facultyProfiles).where(eq(facultyProfiles.userId, user.userId)).limit(1);
  const memberships = await db
    .select({ membershipId: organizationMemberships.id, organizationId: organizationMemberships.organizationId, organizationType: organizations.organizationType, role: organizationMemberships.role })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(eq(organizationMemberships.userId, user.userId));

  const capabilities = new Set<string>();
  if (student) capabilities.add("STUDENT");
  if (faculty) capabilities.add("FACULTY");
  for (const m of memberships) {
    if (m.organizationType === "EXTERNAL_PARTNER") capabilities.add("PARTNER_REPRESENTATIVE");
    if (m.organizationType === "INTERNAL_UNIT") capabilities.add("INTERNAL_UNIT_MEMBER");
  }

  return {
    capabilities: capabilities as AuthenticatedActor["capabilities"],
    facultyProfile: faculty ? { userId: faculty.userId } : null,
    memberships: memberships as AuthenticatedActor["memberships"],
    studentProfile: student ? { userId: student.userId } : null,
    user,
  };
}
