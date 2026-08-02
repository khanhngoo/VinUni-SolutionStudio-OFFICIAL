import { Section } from "@/components/ui/section";
import type { Challenge } from "@/lib/types";

interface AssessmentSectionProps {
  challenge: Challenge;
}

export function AssessmentSection({ challenge }: AssessmentSectionProps) {
  return (
    <Section title="How you'll be assessed">
      <div className="grid sm:grid-cols-2 gap-2.5">
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Assessment</h3>
          <p className="font-semibold text-[13.5px]">
            {challenge.assessmentTrack}
          </p>
          <p className="text-meta text-ink-3 mt-1">
            {challenge.assessmentMinutes} minutes · proctored and lockdown ·
            7-day window
          </p>
        </div>
        <div className="bg-card border border-line rounded-card px-4 py-3.5">
          <h3 className="mb-1.5">Interview</h3>
          <p className="font-semibold text-[13.5px]">
            {challenge.interviewFormat}
          </p>
          <p className="text-meta text-ink-3 mt-1">
            Scheduled after your assessment passes.
          </p>
        </div>
      </div>
    </Section>
  );
}
