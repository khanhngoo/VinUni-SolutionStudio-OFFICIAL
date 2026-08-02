import { notFound } from "next/navigation";
import { ApplyPanel } from "@/components/challenge/apply-panel";
import { AssessmentSection } from "@/components/challenge/assessment-section";
import { DetailHeader } from "@/components/challenge/detail-header";
import { EligibilitySection } from "@/components/challenge/eligibility-section";
import { LockedBlock } from "@/components/challenge/locked-block";
import { PipelineCta } from "@/components/challenge/pipeline-cta";
import { SelectionTimeline } from "@/components/challenge/selection-timeline";
import { SummarySection } from "@/components/challenge/summary-section";
import { Section } from "@/components/ui/section";
import { currentStudent } from "@/lib/data/student";
import { checkEligibility } from "@/lib/eligibility";
import { timelineIndex } from "@/lib/pipeline";
import {
  getAllChallengeIds,
  getApplicationByChallengeId,
  getChallengeById,
  getFacultyOptions,
} from "@/lib/queries";

export function generateStaticParams() {
  return getAllChallengeIds().map((id) => ({ id }));
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = getChallengeById(id);
  if (!challenge) notFound();

  const eligibility = checkEligibility(currentStudent, challenge);
  const application = getApplicationByChallengeId(challenge.id);

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <DetailHeader challenge={challenge} />

      <div className="mt-7">
        {application ? (
          <>
            <PipelineCta application={application} />
            <Section title="Selection timeline">
              <div className="bg-card border border-line rounded-card px-5 py-6">
                <SelectionTimeline
                  currentNodeIndex={timelineIndex(application.stage)}
                />
              </div>
            </Section>
          </>
        ) : (
          <ApplyPanel
            challenge={challenge}
            eligibility={eligibility}
            facultyOptions={getFacultyOptions(challenge)}
            defaultHours={currentStudent.hoursAvailable}
          />
        )}
      </div>

      <SummarySection
        challenge={challenge}
        studentSkills={currentStudent.skills}
      />

      <AssessmentSection challenge={challenge} />

      <EligibilitySection challenge={challenge} result={eligibility} />

      <Section
        title="Unlocks as you progress"
        aside="Hidden until you clear each gate"
      >
        <div className="flex flex-col gap-2.5">
          {challenge.lockedBlocks.map((block) => (
            <LockedBlock key={block.id} block={block} />
          ))}
        </div>
      </Section>
    </article>
  );
}
