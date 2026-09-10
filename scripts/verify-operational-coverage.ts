import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { challenges, offers } from "@/db/schema";
import {
  getAdminAttentionItems,
  getAdminSystemStatus,
  listAdminAssessmentAttempts,
  listAdminOffers,
} from "@/db/queries/admin";

/**
 * Phase 6.6 Checkpoint G verifier: the two new workflow-inventory queries
 * (bounded pagination, deterministic ordering), the three attention-item
 * counts (each proven against a real, temporarily mutated seeded row rather
 * than trusted by inspection alone — every mutation is restored, checked
 * via a `finally` block), and `getAdminSystemStatus()`'s safety (no secret
 * material in its output, a real live database connectivity check, a real
 * applied-migration lookup).
 */
async function main() {
  // --- Query sanity: bounded, deterministic, empty-out-of-range. ---
  const assessmentPage = await listAdminAssessmentAttempts({ page: 1 });
  assert(assessmentPage.items.length <= assessmentPage.pageSize, "assessment attempt list must respect its page size");
  assert(
    assessmentPage.items.every((item, index) => index === 0 || item.id < assessmentPage.items[index - 1]!.id),
    "assessment attempt list must be deterministically ordered (newest id first)"
  );
  const farAssessmentPage = await listAdminAssessmentAttempts({ page: 10_000 });
  assert(farAssessmentPage.items.length === 0, "a far-out-of-range assessment page must return no rows, not an error");

  const offerPage = await listAdminOffers({ page: 1 });
  assert(offerPage.items.length <= offerPage.pageSize, "offer list must respect its page size");
  assert(
    offerPage.items.every((item, index) => index === 0 || item.id < offerPage.items[index - 1]!.id),
    "offer list must be deterministically ordered (newest id first)"
  );
  const farOfferPage = await listAdminOffers({ page: 10_000 });
  assert(farOfferPage.items.length === 0, "a far-out-of-range offer page must return no rows, not an error");

  // --- Attention items: each count proven against a real temporary
  // mutation of a seeded row, restored in `finally`. ---
  await verifyStaleReviewCount();
  await verifyExpiredOpenCount();
  await verifyOverdueOfferCount();

  // --- System status: safe fields only, real connectivity/migration check. ---
  await verifySystemStatus();

  console.log("Phase 6.6 Checkpoint G operational-coverage verification passed.");
}

async function verifyStaleReviewCount() {
  const [target] = await db
    .select({ id: challenges.id, updatedAt: challenges.updatedAt })
    .from(challenges)
    .where(inArray(challenges.status, ["SUBMITTED", "UNDER_REVIEW"]))
    .limit(1);
  if (!target) throw new Error("Seed data must include at least one SUBMITTED or UNDER_REVIEW challenge.");

  const before = (await getAdminAttentionItems()).staleReviewChallenges;

  try {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db.update(challenges).set({ updatedAt: eightDaysAgo }).where(eq(challenges.id, target.id));

    const during = (await getAdminAttentionItems()).staleReviewChallenges;
    assert(during === before + 1, "aging a review-queue challenge past 7 days must increment staleReviewChallenges by exactly 1");
  } finally {
    await db.update(challenges).set({ updatedAt: target.updatedAt }).where(eq(challenges.id, target.id));
  }

  const after = (await getAdminAttentionItems()).staleReviewChallenges;
  assert(after === before, "restoring updatedAt must return staleReviewChallenges to its original value");
}

async function verifyExpiredOpenCount() {
  const [target] = await db
    .select({ id: challenges.id, applicationDeadline: challenges.applicationDeadline })
    .from(challenges)
    .where(eq(challenges.status, "APPLICATIONS_OPEN"))
    .limit(1);
  if (!target) throw new Error("Seed data must include at least one APPLICATIONS_OPEN challenge.");

  const before = (await getAdminAttentionItems()).expiredOpenChallenges;

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.update(challenges).set({ applicationDeadline: yesterday }).where(eq(challenges.id, target.id));

    const during = (await getAdminAttentionItems()).expiredOpenChallenges;
    assert(
      during === before + 1,
      "moving an open challenge's deadline into the past must increment expiredOpenChallenges by exactly 1"
    );
  } finally {
    await db
      .update(challenges)
      .set({ applicationDeadline: target.applicationDeadline })
      .where(eq(challenges.id, target.id));
  }

  const after = (await getAdminAttentionItems()).expiredOpenChallenges;
  assert(after === before, "restoring applicationDeadline must return expiredOpenChallenges to its original value");
}

async function verifyOverdueOfferCount() {
  const [target] = await db
    .select({ id: offers.id, respondBy: offers.respondBy })
    .from(offers)
    .where(eq(offers.status, "PENDING"))
    .limit(1);
  if (!target) throw new Error("Seed data must include at least one PENDING offer.");

  const before = (await getAdminAttentionItems()).overduePendingOffers;

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.update(offers).set({ respondBy: yesterday }).where(eq(offers.id, target.id));

    const during = (await getAdminAttentionItems()).overduePendingOffers;
    assert(
      during === before + 1,
      "moving a pending offer's respond-by date into the past must increment overduePendingOffers by exactly 1"
    );
  } finally {
    await db.update(offers).set({ respondBy: target.respondBy }).where(eq(offers.id, target.id));
  }

  const after = (await getAdminAttentionItems()).overduePendingOffers;
  assert(after === before, "restoring respondBy must return overduePendingOffers to its original value");
}

async function verifySystemStatus() {
  const status = await getAdminSystemStatus();

  assert(status.databaseConnected === true, "getAdminSystemStatus must report a live database as connected");
  assert(status.latestMigration !== null, "getAdminSystemStatus must find the latest applied migration");
  assert(
    /^\d{4}_/.test(status.latestMigration!.tag ?? ""),
    "the latest migration tag must match the drizzle-kit 000N_name convention"
  );
  assert(status.latestMigration!.appliedAt instanceof Date, "the latest migration's appliedAt must be a real Date");
  assert(status.applicationVersion !== "unknown", "getAdminSystemStatus must resolve a real application version");
  assert(status.serverTime instanceof Date, "getAdminSystemStatus must report a real server time");

  const serialized = JSON.stringify(status);
  const secretNeedles = [
    process.env.DATABASE_URL,
    process.env.AUTH_SECRET,
    "postgres://",
    "postgresql://",
  ].filter((value): value is string => Boolean(value));
  for (const needle of secretNeedles) {
    assert(!serialized.includes(needle), `getAdminSystemStatus output must never contain "${needle.slice(0, 12)}..."`);
  }

  console.log("System status safety check passed:", JSON.stringify(status, null, 2));
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
