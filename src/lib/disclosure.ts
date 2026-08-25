import type { ChallengeListItem } from "@/db/queries/challenges";
import type { LockedBlock } from "@/lib/types";

import { challengeIsRedacted } from "./challenge-marketplace";

/**
 * The disclosure primitive (PRD §5). These three blocks hang off every
 * challenge in the marketplace — the framing is visible, the real brief is not.
 * Uniform by design: what varies is the viewer's tier, not the challenge.
 */
export const STANDARD_LOCKED_BLOCKS: LockedBlock[] = [
  {
    id: "brief",
    title: "Full problem statement",
    unlocksAt: "T3",
    unlockCopy: "Unlocks when you're selected",
    previewLines: 4,
  },
  {
    id: "resources",
    title: "Resources & datasets",
    unlocksAt: "T3",
    unlockCopy: "Unlocks after you sign the NDA",
    previewLines: 3,
  },
  {
    id: "contact",
    title: "Poster contact",
    unlocksAt: "T3",
    unlockCopy: "Unlocks when you're selected",
    previewLines: 2,
  },
];

const COMPENSATION_BLOCK: LockedBlock = {
  id: "compensation",
  title: "Compensation details",
  unlocksAt: "T2",
  unlockCopy: "Unlocks once CAID approves your application",
  previewLines: 2,
};

/**
 * A confidential poster that issued no public compensation note is withholding
 * terms until CAID clears the applicant — so the terms get their own gate at
 * T2, ahead of the T3 selection blocks.
 *
 * Derived rather than stored. The tier a block unlocks at is a function of the
 * viewer's relationship to the challenge, which `challenge-policy.ts` already
 * computes; a `locked_blocks` table would be a second disclosure authority
 * sitting beside it, free to drift.
 */
export function lockedBlocksFor(challenge: ChallengeListItem): LockedBlock[] {
  const withholdsTerms =
    challengeIsRedacted(challenge) && challenge.compensationDescription === null;

  return withholdsTerms
    ? [...STANDARD_LOCKED_BLOCKS, COMPENSATION_BLOCK]
    : STANDARD_LOCKED_BLOCKS;
}
