import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  challengeFacultyAssignments,
  challengeReviews,
  challenges,
  users,
} from "@/db/schema";
import {
  ChallengeWriteError,
  createChallengeDraft,
  getDevelopmentChallengeWriteActor,
  publishApprovedChallenge,
  recordChallengeReviewDecision,
  replaceChallengeFacultyRouting,
  submitChallengeForReview,
  updateChallengeDraft,
  type ChallengeContentWriteInput,
  type ChallengeWriteActorContext,
  type ChallengeWriteErrorCode,
} from "@/services/challenge.service";
import { getChallengeWriteSubjectBySlug } from "@/db/mutations/challenges";

const ROLLBACK = Symbol("rollback phase 4.4 verification");

async function main() {
  const before = await coreCounts();

  try {
    await db.transaction(async (tx) => {
      const options = { database: tx };
      const bencang = await getDevelopmentChallengeWriteActor(
        "BENCANG_CONTACT_DEMO",
        options
      );
      const caid = await getDevelopmentChallengeWriteActor("CAID_ADMIN_DEMO", options);
      const elab = await getDevelopmentChallengeWriteActor("ELAB_ADMIN_DEMO", options);
      const bencangOrgId = organizationIdFor(bencang, "EXTERNAL_PARTNER");
      const caidOrgId = organizationIdFor(caid, "INTERNAL_UNIT");
      const elabOrgId = organizationIdFor(elab, "INTERNAL_UNIT");
      const facultyId = await facultyUserId(options.database);

      const title = `Phase 4.4 transactional write verification ${Date.now()}`;
      const created = await createChallengeDraft(
        {
          ...baseChallengeInput(title),
          eligibilityRules: [
            {
              config: { schools: ["CECS", "CBM"] },
              ruleType: "SCHOOL",
            },
            {
              config: { minGpa: 3.2, scale: 4 },
              required: false,
              ruleType: "MIN_GPA",
            },
          ],
          managingOrganizationId: caidOrgId,
          ownerOrganizationId: bencangOrgId,
          skills: [
            { canonicalName: "Python", requirementType: "REQUIRED" },
            { canonicalName: "SQL", requirementType: "PREFERRED" },
          ],
        },
        bencang,
        options
      );
      assert(created.status === "DRAFT", "valid create should produce DRAFT");

      await expectWriteError(
        "invalid create",
        () =>
          createChallengeDraft(
            {
              ...baseChallengeInput(" "),
              managingOrganizationId: caidOrgId,
              ownerOrganizationId: bencangOrgId,
              teamSizeMin: 4,
              teamSizeMax: 2,
            },
            bencang,
            options
          ),
        "VALIDATION_ERROR"
      );

      await expectWriteError(
        "unrelated owner create",
        () =>
          createChallengeDraft(
            {
              ...baseChallengeInput("Unrelated owner denial"),
              managingOrganizationId: elabOrgId,
              ownerOrganizationId: elabOrgId,
            },
            bencang,
            options
          ),
        "VALIDATION_ERROR"
      );

      await updateChallengeDraft(
        created.slug,
        {
          title: `${title} updated`,
          skills: [
            { canonicalName: "Python", requirementType: "REQUIRED" },
            { canonicalName: "Data Analysis", requirementType: "PREFERRED" },
          ],
        },
        bencang,
        options
      );

      await expectWriteError(
        "unknown skill rollback",
        () =>
          updateChallengeDraft(
            created.slug,
            {
              title: "This title must not persist after invalid skill",
              skills: [
                { canonicalName: "Python", requirementType: "REQUIRED" },
                {
                  canonicalName: "Not A Canonical Phase 4 Skill",
                  requirementType: "PREFERRED",
                },
              ],
            },
            bencang,
            options
          ),
        "VALIDATION_ERROR"
      );

      const afterFailedSkillUpdate = await getChallengeWriteSubjectBySlug(
        tx,
        created.slug
      );
      assert(
        afterFailedSkillUpdate?.title === `${title} updated`,
        "invalid skill update must not partially update title"
      );

      const submitted = await submitChallengeForReview(created.slug, bencang, options);
      assert(submitted.status === "SUBMITTED", "submit should move DRAFT to SUBMITTED");

      await expectWriteError(
        "invalid submit transition",
        () => submitChallengeForReview(created.slug, bencang, options),
        "INVALID_TRANSITION"
      );

      await expectWriteError(
        "unauthorized owner review",
        () =>
          recordChallengeReviewDecision(
            created.slug,
            { comments: "Owner cannot review own managed flow.", decision: "APPROVED" },
            bencang,
            options
          ),
        "FORBIDDEN"
      );

      const approved = await recordChallengeReviewDecision(
        created.slug,
        { comments: "Approved during transactional verification.", decision: "APPROVED" },
        caid,
        options
      );
      assert(approved.status === "APPROVED", "CAID review should approve CAID-managed challenge");

      const published = await publishApprovedChallenge(created.slug, caid, options);
      assert(
        published.status === "APPLICATIONS_OPEN",
        "publish should move APPROVED to APPLICATIONS_OPEN"
      );

      await replaceChallengeFacultyRouting(
        created.slug,
        [{ comments: "Transactional routing verification.", facultyUserId: facultyId }],
        caid,
        options
      );
      const assignmentCount = await countFacultyAssignments(tx, created.slug);
      assert(assignmentCount === 1, "faculty routing should persist one assignment");

      await expectWriteError(
        "owner cannot reroute faculty",
        () =>
          replaceChallengeFacultyRouting(
            created.slug,
            [{ facultyUserId: facultyId }],
            bencang,
            options
          ),
        "FORBIDDEN"
      );

      await expectWriteError(
        "slug collision",
        () =>
          createChallengeDraft(
            {
              ...baseChallengeInput(title),
              managingOrganizationId: caidOrgId,
              ownerOrganizationId: bencangOrgId,
            },
            bencang,
            options
          ),
        "CONFLICT"
      );

      const elabCreated = await createChallengeDraft(
        {
          ...baseChallengeInput(`Phase 4.4 E-Lab boundary ${Date.now()}`),
          managingOrganizationId: elabOrgId,
          ownerOrganizationId: elabOrgId,
          skills: [{ canonicalName: "Business Modelling", requirementType: "REQUIRED" }],
        },
        elab,
        options
      );
      await submitChallengeForReview(elabCreated.slug, elab, options);

      await expectWriteError(
        "CAID cannot manage E-Lab",
        () =>
          recordChallengeReviewDecision(
            elabCreated.slug,
            { decision: "APPROVED" },
            caid,
            options
          ),
        "FORBIDDEN"
      );

      const elabRevision = await recordChallengeReviewDecision(
        elabCreated.slug,
        { comments: "E-Lab revision path verified.", decision: "REVISION_REQUESTED" },
        elab,
        options
      );
      assert(
        elabRevision.status === "REVISION_REQUESTED",
        "E-Lab admin should manage E-Lab-managed challenge"
      );

      const reviewRows = await tx
        .select({ id: challengeReviews.id })
        .from(challengeReviews)
        .innerJoin(challenges, eq(challenges.id, challengeReviews.challengeId))
        .where(eq(challenges.slug, created.slug));
      assert(reviewRows.length === 1, "review history should contain one CAID review row");

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const after = await coreCounts();
  assert(
    JSON.stringify(before) === JSON.stringify(after),
    "rollback verification must preserve canonical counts"
  );

  console.log("Phase 4.4 challenge write verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

function baseChallengeInput(title: string): ChallengeContentWriteInput {
  return {
    applicationDeadline: new Date("2026-09-01T12:00:00Z"),
    compensationDescription: "Verification stipend handled off-platform",
    compensationType: "PAID",
    confidentialityLevel: "STANDARD",
    description:
      "Disposable transactional verification challenge. This row must never persist.",
    domain: "Verification, Operations",
    durationWeeks: 8,
    expectedDeliverables: "- Verification report\n- Service write proof",
    startDate: "2026-09-15",
    subtype: "Project",
    summary:
      "Disposable challenge used to verify Phase 4.4 challenge write operations.",
    teamSizeMax: 3,
    teamSizeMin: 2,
    title,
    visibility: "VINUNI_ONLY",
    weeklyHours: 8,
    workMode: "HYBRID",
  };
}

function organizationIdFor(
  actor: ChallengeWriteActorContext,
  organizationType: "EXTERNAL_PARTNER" | "INTERNAL_UNIT"
) {
  const membership = actor.memberships.find(
    (item) => item.organizationType === organizationType && item.status === "ACTIVE"
  );
  if (!membership) {
    throw new Error(`${actor.email} has no active ${organizationType} membership.`);
  }
  return membership.organizationId;
}

async function facultyUserId(database: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const [faculty] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "faculty.kevin-nguyen.demo@example.test"))
    .limit(1);
  if (!faculty) throw new Error("Demo faculty user was not found.");
  return faculty.id;
}

async function countFacultyAssignments(
  database: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  slug: string
) {
  const rows = await database
    .select({ id: challengeFacultyAssignments.id })
    .from(challengeFacultyAssignments)
    .innerJoin(challenges, eq(challenges.id, challengeFacultyAssignments.challengeId))
    .where(
      and(
        eq(challenges.slug, slug),
        eq(challengeFacultyAssignments.status, "PENDING")
      )
    );
  return rows.length;
}

async function coreCounts() {
  const tables = [
    "challenges",
    "challenge_skills",
    "challenge_eligibility_rules",
    "challenge_faculty_assignments",
    "challenge_reviews",
    "applications",
    "assessments",
    "selections",
    "offers",
    "projects",
    "match_results",
  ];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const result = await db.execute<{ count: number }>(
      `select count(*)::int as count from "${table}"`
    );
    counts[table] = result.rows[0].count;
  }

  return counts;
}

async function expectWriteError(
  label: string,
  action: () => Promise<unknown>,
  code: ChallengeWriteErrorCode
) {
  try {
    await action();
  } catch (error) {
    if (error instanceof ChallengeWriteError && error.code === code) {
      return;
    }
    throw error;
  }

  throw new Error(`${label} should have failed with ${code}.`);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
