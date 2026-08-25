import "dotenv/config";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { applications, challenges, organizations, projects } from "@/db/schema";
import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import {
  getPartnerChallengePage,
  getPartnerDashboard,
  resolvePartnerOrganization,
} from "@/services/partner.service";

async function main() {
  const bencangUser = await resolveAuthenticatedUserByEmail(
    "contact.bencang.demo@example.test"
  );
  if (bencangUser.status !== "RESOLVED") throw new Error("Bến Cảng dev actor not found");
  const bencangActor = await resolveAuthenticatedActor(bencangUser.user);

  const resolution = resolvePartnerOrganization(bencangActor);
  assert(resolution.kind === "RESOLVED", "Bến Cảng actor must resolve to exactly one EXTERNAL_PARTNER org");
  if (resolution.kind !== "RESOLVED") throw new Error("unreachable");

  const [orgRow] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, resolution.organizationId))
    .limit(1);
  assert(orgRow?.name === "Bến Cảng Logistics", "resolved organization must be Bến Cảng Logistics");

  // Independent raw-SQL cross-check of every count the dashboard reports,
  // built directly from the same rows the seed produced — never from the
  // service under test.
  const [{ count: challengeCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(challenges)
    .where(eq(challenges.ownerOrganizationId, resolution.organizationId));

  const [{ count: applicationCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(challenges.ownerOrganizationId, resolution.organizationId));

  const [{ count: projectCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(challenges.ownerOrganizationId, resolution.organizationId));

  const dashboard = await getPartnerDashboard(bencangActor);

  assert(
    dashboard.challenges.length === challengeCount,
    `owned challenge count mismatch: dashboard=${dashboard.challenges.length} sql=${challengeCount}`
  );
  assert(
    dashboard.canReadApplications,
    "BENCANG_CONTACT_DEMO must hold an owner-organization read role (ADMIN/CONTACT_PERSON)"
  );
  assert(
    dashboard.applications.length === applicationCount,
    `application count mismatch: dashboard=${dashboard.applications.length} sql=${applicationCount}`
  );
  assert(
    dashboard.projects.length === projectCount,
    `project count mismatch: dashboard=${dashboard.projects.length} sql=${projectCount}`
  );

  // No fabricated fixture-style IDs (the D4 finding: papp-depot / papp-meridian)
  // ever surface as if they were real PostgreSQL identifiers.
  const fixtureIdPattern = /^papp-/;
  for (const challenge of dashboard.challenges) {
    assert(
      !fixtureIdPattern.test(challenge.publicId),
      `challenge publicId looks like a static fixture ID: ${challenge.publicId}`
    );
  }
  for (const application of dashboard.applications) {
    assert(
      !fixtureIdPattern.test(application.publicId),
      `application publicId looks like a static fixture ID: ${application.publicId}`
    );
  }

  // Cross-partner isolation: a challenge owned by a different organization
  // must resolve to null for the Bến Cảng actor, not merely a smaller
  // disclosure of the same record.
  const [otherOwnedChallenge] = await db
    .select({ slug: challenges.slug })
    .from(challenges)
    .where(sql`${challenges.ownerOrganizationId} != ${resolution.organizationId} and ${challenges.slug} is not null`)
    .limit(1);
  assert(Boolean(otherOwnedChallenge?.slug), "expected at least one challenge owned by a different organization");

  const crossPartnerPage = await getPartnerChallengePage(bencangActor, {
    slug: otherOwnedChallenge!.slug!,
  });
  assert(
    crossPartnerPage === null,
    `Bến Cảng actor must not read a challenge owned by another organization (${otherOwnedChallenge!.slug})`
  );

  console.log("Focused partner runtime verification passed.");
  console.log(
    JSON.stringify(
      {
        applications: dashboard.applications.length,
        challenges: dashboard.challenges.length,
        organization: orgRow.name,
        projects: dashboard.projects.length,
      },
      null,
      2
    )
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Partner runtime verification failed: ${message}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
