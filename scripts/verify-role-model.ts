import "dotenv/config";

import { eq } from "drizzle-orm";

import {
  hasActorCapability,
  isOrganizationAdmin,
  resolveAuthenticatedActor,
} from "@/auth/authenticated-actor";
import { getDevelopmentIdentity } from "@/auth/development-identities";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { db } from "@/db";
import { organizations } from "@/db/schema";

async function main() {
  const [caidOrganization, elabOrganization] = await Promise.all([
    getSeedOrganization("CAID"),
    getSeedOrganization("E-Lab"),
  ]);
  const jordan = await resolveDevelopmentActor("JORDAN_STUDENT_DEMO");
  const faculty = await resolveDevelopmentActor("FACULTY_PHAM_DEMO");
  const partner = await resolveDevelopmentActor("BENCANG_CONTACT_DEMO");
  const caidAdmin = await resolveDevelopmentActor("CAID_ADMIN_DEMO");
  const elabAdmin = await resolveDevelopmentActor("ELAB_ADMIN_DEMO");

  assert(hasActorCapability(jordan, "STUDENT"), "Jordan must resolve STUDENT from student_profiles");
  assert(hasActorCapability(faculty, "FACULTY"), "seeded faculty must resolve FACULTY from faculty_profiles");
  assert(hasActorCapability(partner, "PARTNER_REPRESENTATIVE"), "Bến Cảng contact must resolve external-partner capability");
  assert(caidAdmin.memberships.some((membership) => membership.organizationId === caidOrganization.id && membership.organizationType === "INTERNAL_UNIT" && membership.role === "ADMIN"), "CAID admin must retain its active internal-unit ADMIN membership");
  assert(elabAdmin.memberships.some((membership) => membership.organizationId === elabOrganization.id && membership.organizationType === "INTERNAL_UNIT" && membership.role === "ADMIN"), "E-Lab admin must retain its active internal-unit ADMIN membership");
  assert(isOrganizationAdmin(caidAdmin, caidOrganization.id), "CAID admin must have CAID-scoped ADMIN authority");
  assert(!isOrganizationAdmin(caidAdmin, elabOrganization.id), "CAID admin must not receive E-Lab ADMIN authority");
  assert(isOrganizationAdmin(elabAdmin, elabOrganization.id), "E-Lab admin must have E-Lab-scoped ADMIN authority");
  assert(!isOrganizationAdmin(elabAdmin, caidOrganization.id), "E-Lab admin must not receive CAID ADMIN authority");

  const directJordan = await resolveExistingUser("student.jordan-lee.demo@example.test");
  assert(actorSignature(jordan) === actorSignature(directJordan), "development identity and direct authenticated-user resolution must produce the same actor context");
  const domainOnly = await resolveAuthenticatedActor({ email: "student@vinuni.edu", fullName: "Domain Only", userId: BigInt(-1) });
  assert(!hasActorCapability(domainOnly, "STUDENT") && !hasActorCapability(domainOnly, "FACULTY"), "email domain must not infer a platform persona");
  assert(domainOnly.memberships.length === 0, "organization name or email data alone must not infer membership authority");
  console.log("Phase 6.2 role model verification passed.");
}

async function getSeedOrganization(name: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);
  if (!organization) throw new Error(`Seeded ${name} organization is required for verification.`);
  return organization;
}

async function resolveDevelopmentActor(key: Parameters<typeof getDevelopmentIdentity>[0]) {
  const identity = getDevelopmentIdentity(key);
  if (!identity) throw new Error(`Missing development identity ${key}.`);
  return resolveExistingUser(identity.email);
}

async function resolveExistingUser(email: string) {
  const resolution = await resolveAuthenticatedUserByEmail(email);
  if (resolution.status !== "RESOLVED") throw new Error(`${email} must resolve to an active seeded user.`);
  return resolveAuthenticatedActor(resolution.user);
}

function actorSignature(actor: Awaited<ReturnType<typeof resolveAuthenticatedActor>>) {
  return JSON.stringify({
    capabilities: [...actor.capabilities].sort(),
    facultyProfile: actor.facultyProfile?.userId.toString() ?? null,
    memberships: actor.memberships.map((membership) => ({ ...membership, membershipId: membership.membershipId.toString(), organizationId: membership.organizationId.toString() })).sort((a, b) => a.membershipId.localeCompare(b.membershipId)),
    studentProfile: actor.studentProfile?.userId.toString() ?? null,
    userId: actor.user.userId.toString(),
  });
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => { console.error(error); process.exit(1); });
