import type { Challenge, DirectoryStudent, ScoreBand } from "@/lib/types";

/**
 * The student recommender behind the swipe deck.
 *
 * There is no model here. This is deterministic scoring over the fixture,
 * dressed as a recommendation — which is the honest shape for a demo, and also
 * the shape a real implementation would need anyway: whatever ranks the list,
 * the UI still has to explain itself.
 *
 * Two rules the output obeys:
 *
 *  - The score is per-brief and says so. It reaches the screen alongside
 *    `fitBand` — the same `ScoreBand` vocabulary students see of their own
 *    assessments (PRD §8.5) — but it is one student against one challenge, not
 *    a standing rank, and no surface sorts people across briefs by it.
 *  - Reasons are sentences about the brief, not feature weights. A partner
 *    deciding about a person deserves a claim they can disagree with, and a
 *    number with no reasons under it is not one.
 */

/** How many the deck holds. The partner asked for a shortlist, not a database. */
export const DECK_SIZE = 10;

export interface Recommendation {
  student: DirectoryStudent;
  fitBand: ScoreBand;
  /** Sentences shown under "why this match", strongest first. */
  reasons: string[];
  /** Things the partner should weigh against — shown, never hidden. */
  caveats: string[];
  matchedSkills: string[];
  missingSkills: string[];
  /**
   * Orders the deck, and rendered on the card. A weighted sum rather than a
   * percentage — it can exceed 100 or go negative, so every render path runs it
   * through `clampScore`.
   */
  score: number;
}

function normalise(skill: string): string {
  return skill.trim().toLowerCase();
}

/**
 * Skill overlap, tolerant of the fixture's phrasing drift ("Data analysis" vs
 * "data analytics"): a match is either exact or one containing the other.
 */
function skillsOverlap(
  studentSkills: string[],
  wanted: string[],
): { matched: string[]; missing: string[] } {
  const have = studentSkills.map(normalise);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of wanted) {
    const target = normalise(skill);
    const hit = have.some((s) => s === target || s.includes(target) || target.includes(s));
    if (hit) matched.push(skill);
    else missing.push(skill);
  }

  return { matched, missing };
}

function bandFor(score: number): ScoreBand {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Proficient";
  if (score >= 35) return "Developing";
  return "Below threshold";
}

/**
 * Course pins that speak to this brief. A pinned A in Database Systems is
 * evidence for a data challenge and noise for a design one, so pins are
 * matched against the challenge's tags and skills rather than always shown.
 */
function relevantPins(
  student: DirectoryStudent,
  challenge: Challenge,
): DirectoryStudent["pinnedCourses"] {
  const haystack = [
    ...challenge.domainTags,
    ...challenge.skills.map((s) => s.name),
    challenge.title,
  ]
    .join(" ")
    .toLowerCase();

  return student.pinnedCourses.filter((course) => {
    const words = course.title.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4);
    return words.some((word) => haystack.includes(word));
  });
}

export function scoreStudent(
  student: DirectoryStudent,
  challenge: Challenge,
): Recommendation {
  const must = challenge.skills.filter((s) => s.level === "must").map((s) => s.name);
  const nice = challenge.skills.filter((s) => s.level === "nice").map((s) => s.name);

  const mustHit = skillsOverlap(student.skills, must);
  const niceHit = skillsOverlap(student.skills, nice);

  // Must-have skills carry the score; everything else adjusts it.
  const mustRatio = must.length === 0 ? 1 : mustHit.matched.length / must.length;
  let score = mustRatio * 60;
  score += nice.length === 0 ? 0 : (niceHit.matched.length / nice.length) * 12;

  const hoursGap = challenge.hoursPerWeek - student.hoursAvailable;
  if (hoursGap <= 0) score += 12;
  else if (hoursGap <= 2) score += 5;

  if (student.assessmentBand === "Strong") score += 10;
  else if (student.assessmentBand === "Proficient") score += 6;
  else if (student.assessmentBand === "Developing") score += 2;

  const collegeFits =
    challenge.eligibleColleges === null ||
    challenge.eligibleColleges.includes(student.college);
  if (collegeFits) score += 4;

  const yearFits =
    challenge.eligibleYears.length === 0 ||
    challenge.eligibleYears.includes(student.year);
  if (yearFits) score += 4;

  const pins = relevantPins(student, challenge);
  score += Math.min(pins.length, 2) * 4;

  // At capacity is disqualifying rather than merely negative — the Studio caps
  // a student at two live challenges, so inviting them is not an option.
  if (student.liveChallenges >= 2) score -= 40;

  const reasons: string[] = [];
  const caveats: string[] = [];

  if (mustHit.matched.length === must.length && must.length > 0) {
    reasons.push(
      `Holds every must-have skill for this brief — ${must.join(", ")}.`,
    );
  } else if (mustHit.matched.length > 0) {
    reasons.push(
      `Covers ${mustHit.matched.length} of ${must.length} must-have skills: ${mustHit.matched.join(", ")}.`,
    );
  }

  if (pins.length > 0) {
    const pin = pins[0];
    reasons.push(
      `Showcases ${pin.grade} in ${pin.title} (${pin.code}), which maps onto the core of this work.`,
    );
  }

  if (niceHit.matched.length > 0) {
    reasons.push(`Also brings ${niceHit.matched.join(", ")}.`);
  }

  if (hoursGap <= 0) {
    reasons.push(
      `Available ${student.hoursAvailable} hrs/wk against the ${challenge.hoursPerWeek} you asked for.`,
    );
  }

  if (student.assessmentBand) {
    reasons.push(`Assessed ${student.assessmentBand.toLowerCase()} on a previous Studio challenge.`);
  }

  if (mustHit.missing.length > 0) {
    caveats.push(`No stated experience with ${mustHit.missing.join(", ")}.`);
  }
  if (hoursGap > 0) {
    caveats.push(
      `Offers ${student.hoursAvailable} hrs/wk, ${hoursGap} short of your ${challenge.hoursPerWeek}.`,
    );
  }
  if (!collegeFits) {
    caveats.push(`Outside the colleges you set as eligible.`);
  }
  if (!yearFits) {
    caveats.push(`Year ${student.year}, outside your eligible years.`);
  }
  if (student.liveChallenges >= 2) {
    caveats.push(`Already on two live challenges — at the Studio cap, cannot take another.`);
  } else if (student.liveChallenges === 1) {
    caveats.push(`Already on one live challenge.`);
  }
  if (student.assessmentBand === null) {
    caveats.push(`Has not sat a Studio assessment yet.`);
  }

  return {
    student,
    fitBand: bandFor(score),
    reasons,
    caveats,
    matchedSkills: [...mustHit.matched, ...niceHit.matched],
    missingSkills: mustHit.missing,
    score,
  };
}

/**
 * The deck for one challenge.
 *
 * Capacity is scored, not filtered: a student on two live challenges takes a
 * heavy penalty rather than being removed, so they surface when the pool is
 * small and drop off the end of a full ten-card deck when it is not. The card
 * still renders the "at capacity" state and disables the invite, which is what
 * a partner needs on the rare deck where someone unavailable does place.
 */
/**
 * Ranks a directory against one brief.
 *
 * The directory arrives as an argument rather than being read here, so the
 * privacy scope stays a decision of the query that built it — a partner sees
 * pinned courses and no transcript — and the ranking itself stays pure and
 * testable.
 */
export function recommendationsFor(
  students: DirectoryStudent[],
  challenge: Challenge,
  limit: number = DECK_SIZE,
): Recommendation[] {
  return students
    .map((student) => scoreStudent(student, challenge))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
