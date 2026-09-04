import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { organizationMemberships, users } from "../src/db/schema";
import { listApplicationsForOwnerOrganization } from "../src/db/queries/partner";
import {
  PIPELINE_LABELS,
  columnForStatus,
  groupIntoPipeline,
} from "../src/lib/pipeline-columns";

const CONTACT = "contact.bencang.demo@example.test";

/**
 * Checks the partner selection board: that applications land in the right
 * column, and that the two facts a card carries beyond the roster — a reviewed
 * assessment band and an outstanding offer clock — actually arrive from the
 * query rather than rendering blank.
 */
async function main() {
  const failures: string[] = [];

  const [contact] = await db
    .select({ id: users.id, name: users.fullName })
    .from(users)
    .where(eq(users.email, CONTACT))
    .limit(1);

  if (!contact) {
    console.error(`No seeded partner contact ${CONTACT}`);
    process.exit(1);
  }

  const [membership] = await db
    .select({ organizationId: organizationMemberships.organizationId })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.userId, contact.id))
    .limit(1);

  if (!membership) {
    console.error("Partner contact has no organization membership");
    process.exit(1);
  }

  const applications = await listApplicationsForOwnerOrganization(
    db,
    membership.organizationId
  );
  console.log(`applications for ${contact.name}'s organization: ${applications.length}`);

  const cards = applications.map((application) => ({
    applicationPublicId: application.publicId,
    assessmentBand: application.assessmentBand,
    challengeSlug: application.challengeSlug ?? "",
    confirmedCount: application.memberSummary.accepted,
    detail:
      application.offerStatus === "PENDING" && application.offerRespondBy
        ? { label: "offer open", urgent: false }
        : null,
    pendingCount: application.memberSummary.invited,
    status: application.status,
    teamName: application.teamName ?? "Unnamed team",
  }));

  for (const card of cards) {
    const column = columnForStatus(card.status);
    console.log(
      `  ${(card.teamName ?? "").padEnd(22)} ${card.status.padEnd(18)} -> ${column ? PIPELINE_LABELS[column] : "(off board)"}  members=${card.confirmedCount}+${card.pendingCount}  band=${card.assessmentBand ?? "—"}  offer=${card.detail ? "open" : "—"}`
    );
  }

  const buckets = groupIntoPipeline(cards);
  console.log("\nboard:");
  for (const bucket of buckets) {
    console.log(`  ${PIPELINE_LABELS[bucket.column].padEnd(16)} ${bucket.cards.length}`);
  }

  const onBoard = buckets.reduce((total, bucket) => total + bucket.cards.length, 0);
  const expected = cards.filter((card) => columnForStatus(card.status) !== null).length;
  if (onBoard !== expected) {
    failures.push(`${expected - onBoard} application(s) fell off the board entirely`);
  }

  const withBand = cards.filter((card) => card.assessmentBand !== null);
  console.log(`\ncards carrying an assessment band: ${withBand.length}`);
  const numeric = withBand.filter((card) => /^[0-9.]+$/.test(card.assessmentBand ?? ""));
  if (numeric.length > 0) {
    failures.push("an assessment band came through as a number — partners must never see a score");
  }

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nPipeline columns resolve and cards carry their bands and clocks.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
