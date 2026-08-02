import { notFound, redirect } from "next/navigation";
import { CognitiveRunner } from "@/components/assessment/cognitive-runner";
import { TechnicalRunner } from "@/components/assessment/technical-runner";
import { isTechnicalTrack } from "@/lib/data/assessment";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
} from "@/lib/queries";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  // Single attempt (PRD §8.4): anything past TEST_PENDING goes to the result.
  if (application.stage !== "TEST_PENDING") {
    redirect(`/assessment/${application.id}`);
  }

  return isTechnicalTrack(challenge.assessmentTrack) ? (
    <TechnicalRunner
      applicationId={application.id}
      challengeTitle={challenge.title}
      minutes={challenge.assessmentMinutes}
    />
  ) : (
    <CognitiveRunner
      applicationId={application.id}
      challengeTitle={challenge.title}
    />
  );
}
