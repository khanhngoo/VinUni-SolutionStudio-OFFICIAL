import { Section } from "@/components/ui/section";
import { CheckIcon } from "@/components/ui/icons";
import type { Challenge, EligibilityResult } from "@/lib/types";

interface EligibilitySectionProps {
  challenge: Challenge;
  result: EligibilityResult;
}

export function EligibilitySection({
  challenge,
  result,
}: EligibilitySectionProps) {
  const rules: string[] = [
    challenge.eligibleYears.length === 4
      ? "Open to all years"
      : `Year ${challenge.eligibleYears.join(", ")} students`,
    challenge.eligibleColleges === null
      ? "Open to all colleges"
      : `${challenge.eligibleColleges.join(", ")} students`,
    challenge.minGpa === null
      ? "No GPA requirement"
      : `Minimum GPA ${challenge.minGpa.toFixed(2)}`,
  ];

  return (
    <Section title="Eligibility">
      <div className="bg-card border border-line rounded-card px-4 py-1.5">
        {rules.map((rule) => (
          <p
            key={rule}
            className="flex items-center gap-2.5 py-2.5 border-b border-line-2 last:border-0 text-ink-2"
          >
            <CheckIcon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            {rule}
          </p>
        ))}
      </div>

      {!result.eligible ? (
        <div className="mt-2.5 bg-warn-soft rounded-card px-4 py-3">
          {result.reasons.map((reason) => (
            <p key={reason} className="text-warn">
              {reason}
            </p>
          ))}
        </div>
      ) : null}
    </Section>
  );
}
