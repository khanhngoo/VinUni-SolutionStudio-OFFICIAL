import { Section } from "@/components/ui/section";
import type { MarketplaceChallengeDetailModel } from "@/lib/challenge-marketplace";

interface AssessmentSectionProps {
  challenge: MarketplaceChallengeDetailModel;
}

/**
 * Describes only what is configured: an active assessment (if any) reviewed by
 * the team's faculty supervisor, then a direct partner decision. The Studio
 * schedules no interview and runs no proctoring service.
 */
export function AssessmentSection({ challenge }: AssessmentSectionProps) {
  const assessment = challenge.assessmentSummary;

  return (
    <Section title="How you'll be assessed">
      <div className="grid sm:grid-cols-2 gap-2.5">
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Assessment</h3>
          <p className="font-semibold text-[13.5px]">
            {assessment?.trackLabel ?? "No assessment configured"}
          </p>
          <p className="text-meta text-ink-3 mt-1">
            {assessment
              ? `${
                  assessment.timeLimitMinutes
                    ? `${assessment.timeLimitMinutes} minutes · `
                    : ""
                }single attempt in fullscreen · reviewed by your faculty supervisor`
              : "Applications go to partner selection once your supervisor confirms."}
          </p>
        </div>
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Partner selection</h3>
          <p className="font-semibold text-[13.5px]">Direct decision by the partner</p>
          <p className="text-meta text-ink-3 mt-1">
            The partner reviews eligible applications. A selected team&apos;s
            leader receives an offer to accept.
          </p>
        </div>
      </div>
    </Section>
  );
}
