import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getChallengeWriteSubjectBySlug } from "@/db/mutations/challenges";
import {
  ChallengeWriteError,
  createChallengeDraft,
  getDevelopmentChallengeWriteActor,
  publishApprovedChallenge,
  recordChallengeReviewDecision,
  submitChallengeForReview,
  type ChallengeContentWriteInput,
  type ChallengeWriteActorContext,
  type ChallengeWriteErrorCode,
} from "@/services/challenge.service";
import { listAdminAuditEvents } from "@/db/queries/admin";

const ROLLBACK = Symbol("rollback Phase 6.6 Checkpoint E audit verification");

/**
 * Phase 6.6 Checkpoint E verifier. Exercises the challenge-lifecycle audit
 * instrumentation added to `challenge-write.service.ts` (Section 11.3/11.4
 * of `context/admin-console-implementation-plan.md`): every successful
 * transition writes exactly the expected `audit_logs` row in the same
 * transaction as the domain write, and every rejected transition writes
 * none. The whole scenario runs inside one outer transaction that is
 * explicitly rolled back at the end (same pattern as
 * `scripts/verify-challenge-writes.ts`), so a passing run also proves the
 * mutation and its audit row commit or roll back together: nothing here
 * persists past this script.
 */
async function main() {
  const before = await totalAuditRows();

  try {
    await db.transaction(async (tx) => {
      const options = { database: tx };
      const bencang = await getDevelopmentChallengeWriteActor("BENCANG_CONTACT_DEMO", options);
      const caid = await getDevelopmentChallengeWriteActor("CAID_ADMIN_DEMO", options);
      const elab = await getDevelopmentChallengeWriteActor("ELAB_ADMIN_DEMO", options);
      const bencangOrgId = organizationIdFor(bencang, "EXTERNAL_PARTNER");
      const caidOrgId = organizationIdFor(caid, "INTERNAL_UNIT");
      const elabOrgId = organizationIdFor(elab, "INTERNAL_UNIT");

      // --- CHALLENGE_CREATED ---
      const created = await createChallengeDraft(
        {
          ...baseChallengeInput(`Phase 6.6 Checkpoint E audit verification ${Date.now()}`),
          managingOrganizationId: caidOrgId,
          ownerOrganizationId: bencangOrgId,
        },
        bencang,
        options
      );
      const challengeId = await requireChallengeId(tx, created.slug);
      await assertSingleAuditRow(tx, challengeId, "CHALLENGE_CREATED");

      // --- Failed mutation must write no audit row: an owner cannot review
      // its own managed flow, before the challenge has even been submitted. ---
      const countBeforeForbiddenReview = await countAuditRows(tx, challengeId);
      await expectWriteError(
        "owner cannot review own managed flow",
        () =>
          recordChallengeReviewDecision(
            created.slug,
            { decision: "APPROVED" },
            bencang,
            options
          ),
        "FORBIDDEN"
      );
      assert(
        (await countAuditRows(tx, challengeId)) === countBeforeForbiddenReview,
        "a FORBIDDEN review attempt must not write an audit row"
      );

      // --- CHALLENGE_SUBMITTED ---
      await submitChallengeForReview(created.slug, bencang, options);
      await assertSingleAuditRow(tx, challengeId, "CHALLENGE_SUBMITTED");

      // --- Failed mutation must write no audit row: submitting an already
      // SUBMITTED challenge is an invalid transition. ---
      const countBeforeInvalidResubmit = await countAuditRows(tx, challengeId);
      await expectWriteError(
        "invalid resubmit transition",
        () => submitChallengeForReview(created.slug, bencang, options),
        "INVALID_TRANSITION"
      );
      assert(
        (await countAuditRows(tx, challengeId)) === countBeforeInvalidResubmit,
        "an INVALID_TRANSITION resubmit must not write an audit row"
      );

      // --- CHALLENGE_APPROVED ---
      await recordChallengeReviewDecision(
        created.slug,
        { comments: "Approved during Checkpoint E audit verification.", decision: "APPROVED" },
        caid,
        options
      );
      const approvedRow = await assertSingleAuditRow(tx, challengeId, "CHALLENGE_APPROVED");
      assert(
        (approvedRow.details as { decision?: string } | null)?.decision === "APPROVED",
        "CHALLENGE_APPROVED details.decision must be APPROVED"
      );

      // --- CHALLENGE_PUBLISHED ---
      await publishApprovedChallenge(created.slug, caid, options);
      await assertSingleAuditRow(tx, challengeId, "CHALLENGE_PUBLISHED");

      // --- A second lifecycle: CHALLENGE_REVISION_REQUESTED, then the
      // documented REJECTED coverage gap (falls back to the catalog's
      // generic CHALLENGE_REVIEWED code — see the doc comment on
      // `reviewDecisionAuditAction` in `challenge-write.service.ts`). ---
      const elabCreated = await createChallengeDraft(
        {
          ...baseChallengeInput(`Phase 6.6 Checkpoint E audit verification (E-Lab) ${Date.now()}`),
          managingOrganizationId: elabOrgId,
          ownerOrganizationId: elabOrgId,
        },
        elab,
        options
      );
      const elabChallengeId = await requireChallengeId(tx, elabCreated.slug);

      await submitChallengeForReview(elabCreated.slug, elab, options);
      await recordChallengeReviewDecision(
        elabCreated.slug,
        { comments: "Revision requested during Checkpoint E audit verification.", decision: "REVISION_REQUESTED" },
        elab,
        options
      );
      await assertSingleAuditRow(tx, elabChallengeId, "CHALLENGE_REVISION_REQUESTED");

      await submitChallengeForReview(elabCreated.slug, elab, options);
      await recordChallengeReviewDecision(
        elabCreated.slug,
        { comments: "Rejected during Checkpoint E audit verification.", decision: "REJECTED" },
        elab,
        options
      );
      const rejectedRow = await assertSingleAuditRow(tx, elabChallengeId, "CHALLENGE_REVIEWED");
      assert(
        (rejectedRow.details as { decision?: string } | null)?.decision === "REJECTED",
        "the REJECTED-decision CHALLENGE_REVIEWED row must record details.decision"
      );

      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  const after = await totalAuditRows();
  assert(before === after, "rolling back the outer transaction must leave audit_logs unchanged");

  await verifyQueryLayer();

  console.log("Phase 6.6 Checkpoint E audit verification passed.");
}

async function verifyQueryLayer() {
  const page = await listAdminAuditEvents({ page: 1 });
  assert(page.items.length <= page.pageSize, "audit event list must respect its page size");
  assert(page.page === 1 && page.hasPreviousPage === false, "page 1 must never claim a previous page");
  const idsDescending = page.items.every(
    (item, index) => index === 0 || item.id < page.items[index - 1]!.id
  );
  assert(idsDescending, "audit event list must be deterministically ordered (newest id first)");

  if (page.total > 0) {
    const sample = page.items[0]!;
    const filtered = await listAdminAuditEvents({ page: 1, action: sample.action as never });
    assert(
      filtered.items.every((item) => item.action === sample.action),
      "filtering by action must only return matching rows"
    );
  }

  const farPage = await listAdminAuditEvents({ page: 10_000 });
  assert(farPage.items.length === 0, "a far-out-of-range page must return no rows, not an error");
}

function baseChallengeInput(title: string): ChallengeContentWriteInput {
  return {
    applicationDeadline: new Date("2026-09-01T12:00:00Z"),
    compensationDescription: "Verification stipend handled off-platform",
    compensationType: "PAID",
    confidentialityLevel: "STANDARD",
    description:
      "Disposable transactional audit verification challenge. This row must never persist.",
    domain: "Verification, Operations",
    durationWeeks: 8,
    expectedDeliverables: "- Verification report\n- Audit write proof",
    startDate: "2026-09-15",
    subtype: "Project",
    summary:
      "Disposable challenge used to verify Phase 6.6 Checkpoint E audit instrumentation.",
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

async function requireChallengeId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  slug: string
) {
  const row = await getChallengeWriteSubjectBySlug(tx, slug);
  if (!row) throw new Error(`Challenge '${slug}' disappeared mid-verification.`);
  return row.id;
}

async function countAuditRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  challengeId: bigint
) {
  const rows = await tx
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "challenge"), eq(auditLogs.entityId, challengeId)));
  return rows.length;
}

async function assertSingleAuditRow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  challengeId: bigint,
  action: string
) {
  const rows = await tx
    .select({ id: auditLogs.id, action: auditLogs.action, details: auditLogs.details })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.entityType, "challenge"),
        eq(auditLogs.entityId, challengeId),
        eq(auditLogs.action, action)
      )
    );
  assert(rows.length === 1, `expected exactly one ${action} audit row for challenge ${challengeId}, found ${rows.length}`);
  return rows[0]!;
}

async function totalAuditRows() {
  const rows = await db.select({ id: auditLogs.id }).from(auditLogs);
  return rows.length;
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
