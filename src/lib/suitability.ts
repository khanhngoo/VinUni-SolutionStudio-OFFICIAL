import { currentStudent } from "@/lib/data/student";
import { getDirectoryStudentById } from "@/lib/data/directory";
import { scoreStudent } from "@/lib/recommendations";
import { clampScore } from "@/lib/score";
import type { Challenge, ScoreBand } from "@/lib/types";

export interface Suitability {
  score: number;
  band: ScoreBand;
  reasons: string[];
  caveats: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

/**
 * The same matcher the partner deck runs, pointed the other way: one student
 * against many briefs instead of many students against one brief.
 *
 * Reusing `scoreStudent` rather than writing a second scorer is the point — a
 * student who sees 78 on a card and a partner who sees 78 on the same pairing
 * are looking at one number, so neither side can be surprised by the other's.
 */
export function suitabilityFor(challenge: Challenge): Suitability {
  const me = getDirectoryStudentById(currentStudent.id);
  if (!me) {
    throw new Error(
      `currentStudent ${currentStudent.id} is missing from the directory`,
    );
  }

  const rec = scoreStudent(me, challenge);
  return {
    score: clampScore(rec.score),
    band: rec.fitBand,
    reasons: rec.reasons,
    caveats: rec.caveats,
    matchedSkills: rec.matchedSkills,
    missingSkills: rec.missingSkills,
  };
}
