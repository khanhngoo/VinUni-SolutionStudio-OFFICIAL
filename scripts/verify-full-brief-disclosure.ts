import "dotenv/config";

import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { getDevelopmentIdentity } from "@/auth/development-identities";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";

/**
 * The full brief is the product's T3 payoff. This proves the gate both ways:
 * it withholds the brief from every marketplace viewer, and it does release it
 * once the caller asserts a selected application. Without the second half the
 * first would pass even if the column were simply never populated.
 */

const BRIEFED_SLUG = "supply-chain-dashboard";

async function main() {
  const jordan = await actor("JORDAN_STUDENT_DEMO");
  const browsing = marketplaceContextForActor(jordan);

  const hidden = await getMarketplaceChallengeBySlug(BRIEFED_SLUG, browsing);
  assert(hidden, "seeded challenge must be visible to an internal student");
  assert(hidden.fullBrief === null, "brief leaked to a browsing student");

  const revealed = await getMarketplaceChallengeBySlug(BRIEFED_SLUG, {
    ...browsing,
    hasSelectedApplication: true,
  });
  assert(revealed, "challenge must still resolve for a selected student");
  assert(
    revealed.fullBrief !== null && revealed.fullBrief.length > 0,
    "brief withheld from a selected student — the gate is not releasable, " +
      "which would make the leak assertion vacuous"
  );

  console.log("full brief disclosure verified (withheld while browsing, released once selected)");
  process.exit(0);
}

async function actor(key: Parameters<typeof getDevelopmentIdentity>[0]) {
  const identity = getDevelopmentIdentity(key);
  if (!identity) throw new Error(`Missing development identity ${key}.`);
  const user = await resolveAuthenticatedUserByEmail(identity.email);
  if (user.status !== "RESOLVED") throw new Error(`Unresolved user ${key}.`);
  return resolveAuthenticatedActor(user.user);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
