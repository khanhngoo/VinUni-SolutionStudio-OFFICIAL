import type { Challenge, EligibilityResult, Student } from "@/lib/types";

/**
 * PRD §6.4: a student below a gate still sees the challenge — the apply button is
 * disabled with a specific reason instead. Reasons quote the student's own
 * numbers so the block is legible rather than mysterious.
 */
export function checkEligibility(
  student: Student,
  challenge: Challenge,
): EligibilityResult {
  const reasons: string[] = [];

  if (challenge.minGpa !== null && student.gpa < challenge.minGpa) {
    reasons.push(
      `Requires a GPA of ${challenge.minGpa.toFixed(2)} — yours is ${student.gpa.toFixed(2)}.`,
    );
  }

  if (!challenge.eligibleYears.includes(student.year)) {
    reasons.push(
      `Open to ${formatYears(challenge.eligibleYears)} — you're in Year ${student.year}.`,
    );
  }

  if (
    challenge.eligibleColleges !== null &&
    !challenge.eligibleColleges.includes(student.college)
  ) {
    reasons.push(
      `Open to ${challenge.eligibleColleges.join(", ")} students — you're in ${student.college}.`,
    );
  }

  return { eligible: reasons.length === 0, reasons };
}

function formatYears(years: number[]): string {
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 1) return `Year ${sorted[0]}`;
  const last = sorted[sorted.length - 1];
  return `Years ${sorted.slice(0, -1).join(", ")} and ${last}`;
}
