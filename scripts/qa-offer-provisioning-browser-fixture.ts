import "dotenv/config";

import { eq, inArray, like, or } from "drizzle-orm";

import { db } from "@/db";
import {
  agreements,
  applicationMembers,
  applications,
  assessmentQuestions,
  assessmentSections,
  assessments,
  challenges,
  offers,
  organizations,
  projects,
  selections,
  supervisionRequests,
  users,
} from "@/db/schema";
import { createApplication, toApplicationActorContext } from "@/services/application.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import { issueSelectionOffer } from "@/services/offer.service";
import { getAuthenticatedActorForVerification } from "./_actor";

/**
 * Phase 6.6.7 browser QA fixtures. Only what has no UI is done here:
 * attaching an assessment definition, and pre-building side-branch offers
 * (team / decline / expired) through the real services. The canonical
 * branch itself is driven end-to-end in the browser.
 */
const PREFIX = "qa-667-";
const ASSESSMENT_TITLE = "Phase 6.6.7 Browser QA assessment";

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command === "cleanup") {
    await cleanup();
    console.log("Phase 6.6.7 browser fixtures removed.");
  } else if (command === "attach-assessment") {
    await attachAssessment(arg);
  } else if (command === "side-branches") {
    await sideBranches();
  } else {
    throw new Error("Use attach-assessment <slug>, side-branches, or cleanup.");
  }
}

async function attachAssessment(slug: string) {
  if (!slug?.startsWith(PREFIX)) throw new Error(`Slug must start with ${PREFIX}.`);
  const [challenge] = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.slug, slug)).limit(1);
  if (!challenge) throw new Error(`Challenge ${slug} not found.`);
  const [caid] = await db.select({ id: users.id }).from(users).where(eq(users.email, "caid.admin.dev@example.test")).limit(1);
  const [assessment] = await db
    .insert(assessments)
    .values({
      challengeId: challenge.id,
      createdBy: caid.id,
      passingScore: 60,
      scope: "INDIVIDUAL",
      status: "ACTIVE",
      timeLimitMinutes: null,
      title: ASSESSMENT_TITLE,
    })
    .returning({ id: assessments.id });
  const [section] = await db
    .insert(assessmentSections)
    .values({ assessmentId: assessment.id, sequence: 1, title: "Reasoning" })
    .returning({ id: assessmentSections.id });
  await db.insert(assessmentQuestions).values({
    config: {
      correctIndex: 1,
      options: ["Ignore the persisted evidence", "Review the authoritative records", "Create a default result"],
    },
    maxScore: 1,
    prompt: "What should an assessment reviewer use to make a decision?",
    questionType: "MULTIPLE_CHOICE",
    sectionId: section.id,
    sequence: 1,
  });
  console.log(`Attached ACTIVE assessment (passing 60) to ${slug}.`);
}

async function sideBranches() {
  const [owner, priya, bao, jordan, hoang, diane, kevin] = await Promise.all(
    [
      "contact.bencang.demo@example.test",
      "student.priya-raman.demo@example.test",
      "student.bao-tran.demo@example.test",
      "student.jordan-lee.demo@example.test",
      "student.hoang-tran.demo@example.test",
      "faculty.diane-osei.demo@example.test",
      "faculty.kevin-nguyen.demo@example.test",
    ].map(getAuthenticatedActorForVerification)
  );
  const ownerOrganizationId = owner.memberships.find((m) => m.organizationType === "EXTERNAL_PARTNER")!.organizationId;
  const [caid] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.name, "CAID")).limit(1);
  const now = new Date();

  async function offerFor(
    suffix: string,
    leader: typeof priya,
    supervisor: typeof diane,
    members: Array<{ status: "ACCEPTED"; studentEmail: string; preferredRole?: string }> = []
  ) {
    const size = members.length + 1;
    const [challenge] = await db
      .insert(challenges)
      .values({
        applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
        contactPersonId: owner.user.userId,
        description: `Disposable Phase 6.6.7 browser ${suffix} branch.`,
        managingOrganizationId: caid.id,
        ownerOrganizationId,
        slug: `${PREFIX}pw-${suffix}`,
        status: "APPLICATIONS_OPEN",
        summary: `Disposable Phase 6.6.7 browser ${suffix} branch.`,
        teamSizeMax: size,
        teamSizeMin: size,
        title: `QA 667 browser ${suffix}`,
        visibility: "VINUNI_ONLY",
        weeklyHours: 10,
      })
      .returning({ slug: challenges.slug });
    const created = await createApplication(
      {
        challengeSlug: challenge.slug!,
        facultySupervisorId: supervisor.user.userId,
        leaderCommittedHoursPerWeek: 10,
        leaderPreferredRole: "Data & ML",
        members,
        motivation: `Disposable Phase 6.6.7 browser ${suffix} branch.`,
        teamName: `QA 667 ${suffix}`,
      },
      toApplicationActorContext(leader),
      { now }
    );
    const [request] = await db
      .select({ id: supervisionRequests.id })
      .from(supervisionRequests)
      .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
      .where(eq(applications.publicId, created.publicId));
    await respondToSupervisionRequest(request.id, "ACCEPT", supervisor, { now });
    await issueSelectionOffer(
      created.publicId,
      {
        compensationNote: `Disposable ${suffix} offer.`,
        durationWeeks: 8,
        hoursPerWeek: 10,
        ndaRequired: false,
        respondByWorkingDays: 5,
        startDate: "2026-10-26",
      },
      owner,
      { now }
    );
    return created.publicId;
  }

  const team = await offerFor("team", priya, diane, [
    { preferredRole: "Backend", status: "ACCEPTED", studentEmail: bao.user.email },
  ]);
  // Mirrors the canonical seeded pending offer's INVITED member; the product
  // path cannot add one after selection, so it is inserted directly.
  const [teamApp] = await db.select({ id: applications.id }).from(applications).where(eq(applications.publicId, team));
  await db.insert(applicationMembers).values({
    applicationId: teamApp.id,
    memberRole: "MEMBER",
    preferredRole: "Coordination",
    status: "INVITED",
    studentId: hoang.user.userId,
  });

  const decline = await offerFor("decline", jordan, kevin);
  const expired = await offerFor("expired", hoang, kevin);
  const [expiredApp] = await db.select({ id: applications.id }).from(applications).where(eq(applications.publicId, expired));
  const [expiredSel] = await db.select({ id: selections.id }).from(selections).where(eq(selections.applicationId, expiredApp.id));
  await db.update(offers).set({ respondBy: new Date(Date.now() - 3_600_000) }).where(eq(offers.selectionId, expiredSel.id));

  console.log(JSON.stringify({ decline, expired, team }, null, 2));
}

async function cleanup() {
  await db.transaction(async (tx) => {
    const challengeIds = (
      await tx
        .select({ id: challenges.id })
        .from(challenges)
        .where(or(like(challenges.slug, `${PREFIX}%`), like(challenges.slug, "qa-667%")))
    ).map((r) => r.id);
    if (challengeIds.length === 0) return;
    const applicationIds = (
      await tx.select({ id: applications.id }).from(applications).where(inArray(applications.challengeId, challengeIds))
    ).map((r) => r.id);
    if (applicationIds.length > 0) {
      await tx.delete(projects).where(inArray(projects.applicationId, applicationIds));
      const selectionIds = (
        await tx.select({ id: selections.id }).from(selections).where(inArray(selections.applicationId, applicationIds))
      ).map((r) => r.id);
      if (selectionIds.length > 0) {
        await tx.delete(offers).where(inArray(offers.selectionId, selectionIds));
        await tx.delete(selections).where(inArray(selections.id, selectionIds));
      }
      await tx.delete(agreements).where(inArray(agreements.applicationId, applicationIds));
      await tx.delete(applications).where(inArray(applications.id, applicationIds));
    }
    await tx.delete(assessments).where(inArray(assessments.challengeId, challengeIds));
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
