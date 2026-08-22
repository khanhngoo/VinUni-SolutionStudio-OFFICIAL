"use server";

import { redirect } from "next/navigation";

import { requireAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import {
  saveAssessmentResponse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentResponseInput,
} from "@/services/assessment.service";

export async function startAssessmentForAuthenticatedActor(
  applicationPublicId: string,
  _formData?: FormData
) {
  void _formData;
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  await startAssessmentAttempt(applicationPublicId, actor);
  redirect(`/assessment/${applicationPublicId}/take`);
}

export async function saveAssessmentResponseForAuthenticatedActor(
  applicationPublicId: string,
  questionKey: string,
  response: AssessmentResponseInput
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  await saveAssessmentResponse(applicationPublicId, questionKey, response, actor);
}

export async function submitAssessmentForAuthenticatedActor(
  applicationPublicId: string,
  responses: Record<string, AssessmentResponseInput>
) {
  const actor = toApplicationActorContext(await requireAuthenticatedActor());
  await submitAssessmentAttempt(applicationPublicId, actor, { responses });
}
