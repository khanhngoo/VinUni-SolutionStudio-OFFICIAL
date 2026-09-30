import "dotenv/config";

import { eq, inArray, like } from "drizzle-orm";

import { db } from "@/db";
import {
  agreements,
  applications,
  challenges,
  offers,
  organizations,
  projectResources,
  projects,
  selections,
  supervisionRequests,
} from "@/db/schema";
import { createApplication, toApplicationActorContext } from "@/services/application.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import { issueSelectionOffer } from "@/services/offer.service";
import { getAuthenticatedActorForVerification } from "./_actor";

/**
 * Phase 6.6.8 browser QA fixtures. `setup` stops at a PENDING offer (the
 * 6.6.7 path is exercised again in the browser by the leader accepting it).
 * `add-restricted` adds one agreement-gated resource plus an NDA for the
 * leader only, to observe resource gating. `cleanup` removes everything.
 */
const SLUG = "qa-668-pw";

async function main() {
  const [command] = process.argv.slice(2);
  if (command === "setup") await setup();
  else if (command === "add-restricted") await addRestricted();
  else if (command === "cleanup") {
    await cleanup();
    console.log("Phase 6.6.8 browser fixtures removed.");
  } else throw new Error("Use setup, add-restricted, or cleanup.");
}

async function setup() {
  await cleanup();
  const [owner, priya, bao, pham] = await Promise.all(
    [
      "contact.bencang.demo@example.test",
      "student.priya-raman.demo@example.test",
      "student.bao-tran.demo@example.test",
      "faculty.minh-pham.demo@example.test",
    ].map(getAuthenticatedActorForVerification)
  );
  const ownerOrg = owner.memberships.find((m) => m.organizationType === "EXTERNAL_PARTNER")!.organizationId;
  const [caid] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, "CAID")).limit(1);
  await db.insert(challenges).values({
    applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
    contactPersonId: owner.user.userId,
    description: "Disposable Phase 6.6.8 browser close-out branch.",
    managingOrganizationId: caid.id,
    ownerOrganizationId: ownerOrg,
    slug: SLUG,
    status: "APPLICATIONS_OPEN",
    summary: "Disposable Phase 6.6.8 browser close-out branch.",
    teamSizeMax: 2,
    teamSizeMin: 2,
    title: "QA 668 browser close-out",
    visibility: "VINUNI_ONLY",
    weeklyHours: 10,
  });
  const created = await createApplication(
    {
      challengeSlug: SLUG,
      facultySupervisorId: pham.user.userId,
      leaderCommittedHoursPerWeek: 10,
      leaderPreferredRole: "Data & ML",
      members: [{ preferredRole: "Backend", status: "ACCEPTED", studentEmail: bao.user.email }],
      motivation: "Disposable Phase 6.6.8 browser close-out branch.",
      teamName: "QA 668 Browser Team",
    },
    toApplicationActorContext(priya)
  );
  const [request] = await db
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.publicId, created.publicId));
  await respondToSupervisionRequest(request.id, "ACCEPT", pham);
  await issueSelectionOffer(
    created.publicId,
    { compensationNote: "Disposable 6.6.8 offer.", durationWeeks: 8, hoursPerWeek: 10, ndaRequired: false, respondByWorkingDays: 5, startDate: "2026-09-28" },
    owner
  );
  console.log(JSON.stringify({ applicationPublicId: created.publicId }));
}

async function addRestricted() {
  const [row] = await db
    .select({ applicationId: applications.id, challengeId: applications.challengeId, projectId: projects.id })
    .from(projects)
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(challenges.slug, SLUG));
  if (!row) throw new Error("Accept the offer in the browser first.");
  const priya = await getAuthenticatedActorForVerification("student.priya-raman.demo@example.test");
  await db.insert(projectResources).values({
    description: "Metadata only; no credentials stored.",
    projectId: row.projectId,
    requiresAgreement: true,
    resourceType: "DATASET",
    sensitivityLevel: "RESTRICTED",
    title: "QA 668 restricted dataset",
  });
  await db.insert(agreements).values({
    acceptedAt: new Date(),
    agreementType: "NDA",
    agreementVersion: "v1",
    applicationId: row.applicationId,
    challengeId: row.challengeId,
    userId: priya.user.userId,
  });
  console.log("Added one agreement-gated resource and an NDA for the leader only.");
}

async function cleanup() {
  await db.transaction(async (tx) => {
    const challengeIds = (await tx.select({ id: challenges.id }).from(challenges).where(like(challenges.slug, "qa-668%"))).map((r) => r.id);
    if (challengeIds.length === 0) return;
    const applicationIds = (await tx.select({ id: applications.id }).from(applications).where(inArray(applications.challengeId, challengeIds))).map((r) => r.id);
    if (applicationIds.length > 0) {
      await tx.delete(projects).where(inArray(projects.applicationId, applicationIds));
      const selectionIds = (await tx.select({ id: selections.id }).from(selections).where(inArray(selections.applicationId, applicationIds))).map((r) => r.id);
      if (selectionIds.length > 0) {
        await tx.delete(offers).where(inArray(offers.selectionId, selectionIds));
        await tx.delete(selections).where(inArray(selections.id, selectionIds));
      }
      await tx.delete(agreements).where(inArray(agreements.applicationId, applicationIds));
      await tx.delete(applications).where(inArray(applications.id, applicationIds));
    }
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
