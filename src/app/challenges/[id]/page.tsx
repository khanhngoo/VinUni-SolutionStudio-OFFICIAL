import { notFound } from "next/navigation";
import { AssessmentSection } from "@/components/challenge/assessment-section";
import { DetailHeader } from "@/components/challenge/detail-header";
import { EligibilitySection } from "@/components/challenge/eligibility-section";
import { LockedBlock } from "@/components/challenge/locked-block";
import { MarketplaceApplyPanel } from "@/components/challenge/marketplace-apply-panel";
import { PipelineCta } from "@/components/challenge/pipeline-cta";
import { SelectionTimeline } from "@/components/challenge/selection-timeline";
import { ApplicationRoster } from "@/components/team/application-roster";
import { SummarySection } from "@/components/challenge/summary-section";
import { Section } from "@/components/ui/section";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { lockedBlocksFor } from "@/lib/disclosure";
import { getStudentEligibilityProfile, listStudentSkillNames } from "@/db/queries/challenges";
import { evaluateChallengeEligibility } from "@/services/challenge-policy";
import { getMyApplicationForChallenge, toApplicationActorContext } from "@/services/application.service";
import { deriveApplicationStage, toPipelineView } from "@/services/application-stage";
import { timelineIndex } from "@/lib/pipeline";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";

export const dynamic = "force-dynamic";

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;
  const actor = await getAuthenticatedActor();
  const resolvedActor = actor.status === "RESOLVED" ? actor.actor : null;
  const challenge = await getMarketplaceChallengeBySlug(slug, marketplaceContextForActor(resolvedActor));
  if (!challenge) notFound();

  const isStudent = Boolean(resolvedActor?.studentProfile);
  const [studentSkills, eligibilityProfile] = await Promise.all([
    isStudent ? listStudentSkillNames(resolvedActor!.user.userId) : null,
    isStudent ? getStudentEligibilityProfile(resolvedActor!.user.userId) : null,
  ]);

  const evaluation = eligibilityProfile
    ? evaluateChallengeEligibility(challenge.eligibilityRules, eligibilityProfile)
    : null;

  const myApplication = isStudent
    ? await getMyApplicationForChallenge(slug, toApplicationActorContext(resolvedActor!))
    : null;

  const pipelineView = myApplication
    ? toPipelineView(
        myApplication,
        deriveApplicationStage({
          assessmentSummaries: myApplication.assessmentSummaries,
          offerSummary: myApplication.offerSummary,
          projectSummary: myApplication.projectSummary,
          status: myApplication.status,
        })
      )
    : null;

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <DetailHeader challenge={challenge} />

      <div className="mt-7">
        {pipelineView ? (
          <>
            <PipelineCta application={pipelineView} />
            <Section title="Selection timeline">
              <div className="bg-card border border-line rounded-card px-5 py-6">
                <SelectionTimeline
                  currentNodeIndex={timelineIndex(pipelineView.stage)}
                />
              </div>
            </Section>
            <ApplicationRoster
              members={myApplication!.members}
              teamName={myApplication!.teamName}
              teamSizeMax={challenge.teamSizeMax}
              teamSizeMin={challenge.teamSizeMin}
            />
          </>
        ) : (
          <MarketplaceApplyPanel actor={actor} challenge={challenge} />
        )}
      </div>

      <SummarySection challenge={challenge} studentSkills={studentSkills} />

      <AssessmentSection challenge={challenge} />

      <EligibilitySection challenge={challenge} evaluation={evaluation} />

      <Section title="Contact and academic routing">
        <div className="grid sm:grid-cols-2 gap-2.5">
          <div className="bg-card border border-line rounded-card px-4 py-3.5">
            <h3 className="mb-1.5">Partner contact</h3>
            <p className="text-ink-2">
              {challenge.contactPerson?.displayName ??
                "Revealed after selection"}
            </p>
          </div>
          <div className="bg-card border border-line rounded-card px-4 py-3.5">
            <h3 className="mb-1.5">Faculty routing</h3>
            <p className="text-ink-2">
              {challenge.facultyAssignments.length > 0
                ? `${challenge.facultyAssignments.length} faculty suggestion${
                    challenge.facultyAssignments.length === 1 ? "" : "s"
                  }`
                : "To be assigned"}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Unlocks as you progress"
        aside="Hidden until you clear each gate"
      >
        <div className="flex flex-col gap-2.5">
          {lockedBlocksFor(challenge).map((block) => (
            <LockedBlock key={block.id} block={block} />
          ))}
        </div>
      </Section>
    </article>
  );
}
