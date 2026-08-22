"use server";

import { redirect } from "next/navigation";

import { getTemporaryAssessmentViewer } from "@/lib/assessment-development";
import {
  saveAssessmentResponse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentResponseInput,
} from "@/services/assessment.service";

export async function startAssessmentForDevelopmentViewer(
  applicationPublicId: string,
  _formData?: FormData
) {
  void _formData;
  const actor = await getTemporaryAssessmentViewer();
  await startAssessmentAttempt(applicationPublicId, actor);
  redirect(`/assessment/${applicationPublicId}/take`);
}

export async function saveAssessmentResponseForDevelopmentViewer(
  applicationPublicId: string,
  questionKey: string,
  response: AssessmentResponseInput
) {
  const actor = await getTemporaryAssessmentViewer();
  await saveAssessmentResponse(applicationPublicId, questionKey, response, actor);
}

export async function submitAssessmentForDevelopmentViewer(
  applicationPublicId: string,
  responses: Record<string, AssessmentResponseInput>
) {
  const actor = await getTemporaryAssessmentViewer();
  await submitAssessmentAttempt(applicationPublicId, actor, { responses });
}
