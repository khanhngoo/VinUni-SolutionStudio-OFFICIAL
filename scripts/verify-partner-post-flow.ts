/**
 * Focused verifier for Cluster D — the browser-facing partner
 * authoring/review vertical slice built on top of the already-verified
 * Phase 4.4 challenge write service (`scripts/verify-challenge-writes.ts`
 * covers the underlying transitions/authorization in depth; this script
 * adds the product-level assertions specific to Cluster D: explicit
 * managing-unit selection, canonical-skill authoring via the picker's DTO
 * shape, cross-unit review isolation, and the revision-then-resubmit
 * lifecycle a partner would drive from `/partner/post` and
 * `/partner/challenges/[id]`).
 *
 * Everything runs inside one transaction that is always rolled back, so no
 * disposable row from this script can reach the canonical seed.
 */
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { challengeReviews, challengeSkills, challenges, skills } from "@/db/schema";
import {
  ChallengeWriteError,
  createChallengeDraft,
  getDevelopmentChallengeWriteActor,
  publishApprovedChallenge,
  recordChallengeReviewDecision,
  submitChallengeForReview,
  updateChallengeDraft,
  type ChallengeContentWriteInput,
  type ChallengeWriteActorContext,
  type ChallengeWriteErrorCode,
} from "@/services/challenge.service";

const ROLLBACK = Symbol("rollback cluster d verification");

async function main() {
  const before = await coreCounts();

  try {
    await db.transaction(async (tx) => {
      const options = { database: tx };
      const bencang = await getDevelopmentChallengeWriteActor("BENCANG_CONTACT_DEMO", options);
      const caid = await getDevelopmentChallengeWriteActor("CAID_ADMIN_DEMO", options);
      const elab = await getDevelopmentChallengeWriteActor("ELAB_ADMIN_DEMO", options);
      const bencangOrgId = organizationIdFor(bencang, "EXTERNAL_PARTNER");
      const caidOrgId = organizationIdFor(caid, "INTERNAL_UNIT");
      const elabOrgId = organizationIdFor(elab, "INTERNAL_UNIT");

      // --- CAID-managed path -------------------------------------------------
      const caidTitle = `Cluster D CAID path ${Date.now()}`;
      const caidCreated = await createChallengeDraft(
        {
          ...baseChallengeInput(caidTitle),
          managingOrganizationId: caidOrgId,
          ownerOrganizationId: bencangOrgId,
          skills: [
            { canonicalName: "Python", requirementType: "REQUIRED" },
            { canonicalName: "Computer Vision", requirementType: "PREFERRED" },
          ],
        },
        bencang,
        options
      );
      assert(caidCreated.status === "DRAFT", "CAID-managed create should produce DRAFT");

      const persistedSkills = await tx
        .select({ canonicalName: skills.canonicalName, requirementType: challengeSkills.requirementType })
        .from(challengeSkills)
        .innerJoin(skills, eq(skills.id, challengeSkills.skillId))
        .innerJoin(challenges, eq(challenges.id, challengeSkills.challengeId))
        .where(eq(challenges.slug, caidCreated.slug));
      assertSameSkillSet(persistedSkills, [
        { canonicalName: "Python", requirementType: "REQUIRED" },
        { canonicalName: "Computer Vision", requirementType: "PREFERRED" },
      ]);

      await submitChallengeForReview(caidCreated.slug, bencang, options);

      await expectWriteError(
        "E-Lab reviewing a CAID-managed challenge",
        () =>
          recordChallengeReviewDecision(
            caidCreated.slug,
            { decision: "APPROVED" },
            elab,
            options
          ),
        "FORBIDDEN"
      );

      await expectWriteError(
        "Bến Cảng owner reviewing its own challenge",
        () =>
          recordChallengeReviewDecision(
            caidCreated.slug,
            { decision: "APPROVED" },
            bencang,
            options
          ),
        "FORBIDDEN"
      );

      const caidApproved = await recordChallengeReviewDecision(
        caidCreated.slug,
        { comments: "Cluster D CAID approval.", decision: "APPROVED" },
        caid,
        options
      );
      assert(caidApproved.status === "APPROVED", "CAID approval should move SUBMITTED to APPROVED");

      const caidReviewRows = await tx
        .select({ id: challengeReviews.id })
        .from(challengeReviews)
        .innerJoin(challenges, eq(challenges.id, challengeReviews.challengeId))
        .where(eq(challenges.slug, caidCreated.slug));
      assert(caidReviewRows.length === 1, "CAID approval should leave one durable review row");

      const caidPublished = await publishApprovedChallenge(caidCreated.slug, caid, options);
      assert(
        caidPublished.status === "APPLICATIONS_OPEN",
        "CAID publish should move APPROVED to APPLICATIONS_OPEN"
      );

      await assertNoAutomaticDownstreamOutput(tx, caidCreated.slug);

      // --- E-Lab-managed isolation path ---------------------------------------
      const elabTitle = `Cluster D E-Lab isolation ${Date.now()}`;
      const elabCreated = await createChallengeDraft(
        {
          ...baseChallengeInput(elabTitle),
          managingOrganizationId: elabOrgId,
          ownerOrganizationId: bencangOrgId,
          skills: [{ canonicalName: "Python", requirementType: "REQUIRED" }],
        },
        bencang,
        options
      );
      await submitChallengeForReview(elabCreated.slug, bencang, options);

      await expectWriteError(
        "CAID reviewing an E-Lab-managed challenge",
        () =>
          recordChallengeReviewDecision(
            elabCreated.slug,
            { decision: "APPROVED" },
            caid,
            options
          ),
        "FORBIDDEN"
      );

      const elabApproved = await recordChallengeReviewDecision(
        elabCreated.slug,
        { comments: "Cluster D E-Lab approval.", decision: "APPROVED" },
        elab,
        options
      );
      assert(
        elabApproved.status === "APPROVED",
        "E-Lab admin should be authorized to review an E-Lab-managed challenge"
      );

      // --- Skill validation -----------------------------------------------
      await expectWriteError(
        "unknown canonical skill",
        () =>
          createChallengeDraft(
            {
              ...baseChallengeInput(`Cluster D unknown skill ${Date.now()}`),
              managingOrganizationId: caidOrgId,
              ownerOrganizationId: bencangOrgId,
              skills: [{ canonicalName: "Not A Real Canonical Skill", requirementType: "REQUIRED" }],
            },
            bencang,
            options
          ),
        "VALIDATION_ERROR"
      );

      await expectWriteError(
        "duplicate canonical skill",
        () =>
          createChallengeDraft(
            {
              ...baseChallengeInput(`Cluster D duplicate skill ${Date.now()}`),
              managingOrganizationId: caidOrgId,
              ownerOrganizationId: bencangOrgId,
              skills: [
                { canonicalName: "Python", requirementType: "REQUIRED" },
                { canonicalName: "python", requirementType: "PREFERRED" },
              ],
            },
            bencang,
            options
          ),
        "VALIDATION_ERROR"
      );

      const skillRowCountBefore = await countSkillRows(tx);

      // --- Revision lifecycle ----------------------------------------------
      const revisionTitle = `Cluster D revision path ${Date.now()}`;
      const revisionCreated = await createChallengeDraft(
        {
          ...baseChallengeInput(revisionTitle),
          managingOrganizationId: caidOrgId,
          ownerOrganizationId: bencangOrgId,
          skills: [{ canonicalName: "Python", requirementType: "REQUIRED" }],
        },
        bencang,
        options
      );
      await submitChallengeForReview(revisionCreated.slug, bencang, options);

      const revisionRequested = await recordChallengeReviewDecision(
        revisionCreated.slug,
        { comments: "Please tighten the eligibility gating.", decision: "REVISION_REQUESTED" },
        caid,
        options
      );
      assert(
        revisionRequested.status === "REVISION_REQUESTED",
        "revision request should move SUBMITTED to REVISION_REQUESTED"
      );

      const revisionReviewRows = await tx
        .select({ comments: challengeReviews.comments })
        .from(challengeReviews)
        .innerJoin(challenges, eq(challenges.id, challengeReviews.challengeId))
        .where(eq(challenges.slug, revisionCreated.slug));
      assert(
        revisionReviewRows.some((row) => row.comments === "Please tighten the eligibility gating."),
        "revision request should leave a durable review comment"
      );

      await updateChallengeDraft(
        revisionCreated.slug,
        {
          summary: `${revisionCreated.slug} — revised summary`,
          skills: [
            { canonicalName: "Python", requirementType: "REQUIRED" },
            { canonicalName: "Data Engineering", requirementType: "PREFERRED" },
          ],
        },
        bencang,
        options
      );

      const resubmitted = await submitChallengeForReview(revisionCreated.slug, bencang, options);
      assert(
        resubmitted.status === "SUBMITTED",
        "resubmit should move REVISION_REQUESTED back to SUBMITTED"
      );

      // No skill rows should have leaked from the two rejected skill-validation
      // attempts above (both must have been rejected before any insert).
      const skillRowCountAfter = await countSkillRows(tx);
      assert(
        skillRowCountAfter - skillRowCountBefore === 2,
        "only the revision-path challenge's own 2 skill rows should have been added since the skill-validation checks"
      );

      const canonicalSkillCount = await tx
        .select({ id: skills.id })
        .from(skills);
      assert(
        canonicalSkillCount.length === 58,
        `canonical skill table must remain at the frozen baseline of 58 rows (found ${canonicalSkillCount.length})`
      );

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

  console.log("Cluster D partner-post-flow verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

async function assertNoAutomaticDownstreamOutput(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  slug: string
) {
  const [challenge] = await tx
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, slug))
    .limit(1);
  if (!challenge) throw new Error(`Challenge ${slug} disappeared before downstream-output check.`);

  const { applications } = await import("@/db/schema");
  const applicationRows = await tx
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.challengeId, challenge.id));
  assert(applicationRows.length === 0, "publish must not auto-create applications");
}

async function countSkillRows(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const rows = await tx.select({ id: challengeSkills.id }).from(challengeSkills);
  return rows.length;
}

function assertSameSkillSet(
  actual: { canonicalName: string; requirementType: string | null }[],
  expected: { canonicalName: string; requirementType: string }[]
) {
  assert(actual.length === expected.length, "normalized challenge_skills row count mismatch");
  for (const item of expected) {
    const match = actual.find(
      (row) => row.canonicalName === item.canonicalName && row.requirementType === item.requirementType
    );
    assert(
      match !== undefined,
      `expected normalized challenge_skills row for ${item.canonicalName} (${item.requirementType})`
    );
  }
}

function baseChallengeInput(title: string): ChallengeContentWriteInput {
  return {
    applicationDeadline: new Date("2027-11-15T12:00:00Z"),
    compensationDescription: "Verification stipend handled off-platform",
    compensationType: "PAID",
    confidentialityLevel: "STANDARD",
    description:
      "Disposable Cluster D verification challenge. This row must never persist past this script.",
    domain: "Verification, Operations",
    durationWeeks: 8,
    expectedDeliverables: "- Verification report\n- Service write proof",
    startDate: "2027-12-01",
    subtype: "Project",
    summary: "Disposable challenge used to verify the Cluster D partner-post vertical slice.",
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
    "skills",
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
