import { notFound, redirect } from "next/navigation";
import { CognitiveRunner } from "@/components/assessment/cognitive-runner";
import { TechnicalRunner } from "@/components/assessment/technical-runner";
import { getTemporaryAssessmentViewer } from "@/lib/assessment-development";
import { getAssessmentResult, getAssessmentTakingSession } from "@/services/assessment.service";
import {
  saveAssessmentResponseForDevelopmentViewer,
  submitAssessmentForDevelopmentViewer,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getTemporaryAssessmentViewer();
  const session = await getAssessmentTakingSession(applicationId, actor);

  if (!session) {
    const result = await getAssessmentResult(applicationId, actor);
    if (!result) notFound();
    if (
      result.attempt?.status === "SUBMITTED" ||
      result.attempt?.status === "REVIEWED"
    ) {
      redirect(`/assessment/${applicationId}/result`);
    }
    redirect(`/assessment/${applicationId}`);
  }

  const saveAction = saveAssessmentResponseForDevelopmentViewer.bind(
    null,
    session.application.publicId
  );
  const submitAction = submitAssessmentForDevelopmentViewer.bind(
    null,
    session.application.publicId
  );
  const questions = session.sections.flatMap((section) => section.questions);
  const technical =
    questions.length > 0 &&
    questions.every((question) => question.questionType === "CODING");

  return technical ? (
    <TechnicalRunner
      applicationId={session.application.publicId}
      challengeTitle={session.challenge.title}
      minutes={session.assessment.timeLimitMinutes ?? 0}
      problems={questions}
      responses={session.responses}
      saveResponseAction={saveAction}
      submitAction={submitAction}
    />
  ) : (
    <CognitiveRunner
      applicationId={session.application.publicId}
      challengeTitle={session.challenge.title}
      sections={session.sections}
      responses={session.responses}
      saveResponseAction={saveAction}
      submitAction={submitAction}
    />
  );
}
