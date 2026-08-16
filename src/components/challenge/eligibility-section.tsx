import { Section } from "@/components/ui/section";
import { CheckIcon } from "@/components/ui/icons";
import {
  challengeEligibilityLabels,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";

interface EligibilitySectionProps {
  challenge: MarketplaceChallengeDetailModel;
}

export function EligibilitySection({ challenge }: EligibilitySectionProps) {
  const rules = challengeEligibilityLabels(challenge);

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
    </Section>
  );
}
