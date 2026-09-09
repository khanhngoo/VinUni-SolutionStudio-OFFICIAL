import "dotenv/config";

import { db } from "../src/db";
import { challenges } from "../src/db/schema";
import { ANONYMOUS_MARKETPLACE_CONTEXT } from "../src/lib/challenge-marketplace";
import { listMarketplaceChallenges } from "../src/services/challenge.service";

/**
 * The authoring lifecycle seeds a DRAFT, a SUBMITTED and a REVISION_REQUESTED
 * challenge so /review and the partner edit form have something to act on.
 *
 * The invariant worth guarding is that none of them leaks into the public
 * marketplace. Discoverability is decided by challenge-policy, not by the
 * seed, so this checks the actual service rather than re-reading the status
 * column and trusting it.
 */
async function main() {
  const failures: string[] = [];

  const rows = await db
    .select({ slug: challenges.slug, status: challenges.status, title: challenges.title })
    .from(challenges);

  const byStatus = new Map<string, string[]>();
  for (const row of rows) {
    const key = row.status ?? "(null)";
    byStatus.set(key, [...(byStatus.get(key) ?? []), row.slug ?? row.title]);
  }

  console.log(`challenges: ${rows.length}`);
  for (const [status, slugs] of [...byStatus].sort()) {
    console.log(`  ${status.padEnd(22)} ${slugs.length}  ${slugs.join(", ")}`);
  }

  for (const status of ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"]) {
    if (!byStatus.has(status)) {
      failures.push(`no ${status} challenge seeded — that lifecycle step has no fixture`);
    }
  }

  const page = await listMarketplaceChallenges(
    { filters: {}, page: 1 },
    ANONYMOUS_MARKETPLACE_CONTEXT
  );
  const visible = page.items.map((item) => item.slug);
  console.log(`\nanonymous marketplace shows ${visible.length}: ${visible.join(", ")}`);

  const unpublished = new Set(
    rows
      .filter((row) => row.status !== "APPLICATIONS_OPEN")
      .map((row) => row.slug)
      .filter((slug): slug is string => Boolean(slug))
  );
  const leaked = visible.filter((slug) => unpublished.has(slug));
  if (leaked.length > 0) {
    failures.push(`unpublished challenge(s) visible in the marketplace: ${leaked.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nLifecycle fixtures present and none leak into the marketplace.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
