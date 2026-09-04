import { Section } from "@/components/ui/section";
import type { MarketplaceChallengeDetailModel } from "@/lib/challenge-marketplace";

interface AssessmentSectionProps {
  challenge: MarketplaceChallengeDetailModel;
}

export function AssessmentSection({ challenge }: AssessmentSectionProps) {
  const assessment = challenge.assessmentSummary;

  return (
    <Section title="How you'll be assessed">
      <div className="grid sm:grid-cols-2 gap-2.5">
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Assessment</h3>
          <p className="font-semibold text-[13.5px]">
            {assessment?.trackLabel ?? "Set before applications close"}
          </p>
          <p className="text-meta text-ink-3 mt-1">
            {assessment?.timeLimitMinutes
              ? `${assessment.timeLimitMinutes} minutes · proctored and lockdown · 7-day window`
              : "Proctored and lockdown · 7-day window"}
          </p>
        </div>
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Interview</h3>
          <p className="font-semibold text-[13.5px]">
            {challenge.interviewFormat ?? "Scheduled after assessment review"}
          </p>
          <p className="text-meta text-ink-3 mt-1">
            Scheduled after your assessment passes.
          </p>
        </div>
      </div>
    </Section>
  );
}
