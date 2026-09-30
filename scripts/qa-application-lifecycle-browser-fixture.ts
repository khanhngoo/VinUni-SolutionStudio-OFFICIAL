import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { applications, assessments, challenges, organizations, users } from "@/db/schema";

const SLUG = "qa-664-browser-lifecycle";

async function main() {
  const mode = process.argv[2];
  if (mode === "cleanup") {
    await cleanup();
    console.log("Phase 6.6.4 browser fixture removed.");
    process.exit(0);
  }
  if (mode !== "setup") throw new Error("Use setup or cleanup.");

  await cleanup();
  const [owner, manager, contact] = await Promise.all([
    organizationByName("Bến Cảng Logistics"),
    organizationByName("CAID"),
    userByEmail("contact.bencang.demo@example.test"),
  ]);
  const [challenge] = await db
    .insert(challenges)
    .values({
      applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
      contactPersonId: contact.id,
      description: "Disposable browser verification for Phase 6.6.4.",
      managingOrganizationId: manager.id,
      ownerOrganizationId: owner.id,
      slug: SLUG,
      status: "APPLICATIONS_OPEN",
      summary: "Disposable application lifecycle browser verification.",
      teamSizeMax: 1,
      teamSizeMin: 1,
      title: "QA 664 Browser Lifecycle",
      visibility: "VINUNI_ONLY",
      weeklyHours: 8,
    })
    .returning({ id: challenges.id, publicId: challenges.publicId });
  if (!challenge) throw new Error("Browser fixture challenge was not created.");

  await db.insert(assessments).values({
    challengeId: challenge.id,
    createdBy: contact.id,
    instructions: "Disposable assessment boundary: do not grade in Phase 6.6.4.",
    scope: "INDIVIDUAL",
    status: "ACTIVE",
    title: "QA 664 assessment boundary",
  });

  console.log(JSON.stringify({ challengePublicId: challenge.publicId, slug: SLUG }));
  process.exit(0);
}

async function cleanup() {
  const [challenge] = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, SLUG))
    .limit(1);
  if (!challenge) return;
  await db.transaction(async (tx) => {
    await tx.delete(applications).where(eq(applications.challengeId, challenge.id));
    await tx.delete(challenges).where(eq(challenges.id, challenge.id));
  });
}

async function organizationByName(name: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, name))
    .limit(1);
  if (!organization) throw new Error(`${name} organization missing.`);
  return organization;
}

async function userByEmail(email: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) throw new Error(`${email} user missing.`);
  return user;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

