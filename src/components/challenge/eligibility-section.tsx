import { Section } from "@/components/ui/section";
import { CheckIcon } from "@/components/ui/icons";
import {
  challengeEligibilityLabels,
  eligibilityReasons,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";
import type { EligibilityEvaluation } from "@/services/challenge-policy";

interface EligibilitySectionProps {
  challenge: MarketplaceChallengeDetailModel;
  /** Null for a viewer with no student profile — there is nothing to check. */
  evaluation?: EligibilityEvaluation | null;
}

export function EligibilitySection({
  challenge,
  evaluation,
}: EligibilitySectionProps) {
  const rules = challengeEligibilityLabels(challenge);
  const reasons = evaluation ? eligibilityReasons(evaluation) : null;

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

      {reasons && reasons.failed.length > 0 ? (
        <div className="mt-2.5 bg-warn-soft rounded-card px-4 py-3">
          {reasons.failed.map((reason) => (
            <p key={reason} className="text-warn">
              {reason}
            </p>
          ))}
        </div>
      ) : null}

      {reasons && reasons.failed.length === 0 && reasons.unknown.length > 0 ? (
        <div className="mt-2.5 bg-card border border-line rounded-card px-4 py-3">
          <p className="text-ink-2">
            We can&apos;t check every requirement against your profile yet.
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {reasons.unknown.map((reason) => (
              <li key={reason} className="text-meta text-ink-3">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
