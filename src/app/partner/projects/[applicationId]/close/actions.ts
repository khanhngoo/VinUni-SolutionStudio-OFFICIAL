"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  MilestoneReviewError,
  submitPartnerCloseoutFeedback,
} from "@/services/milestone-review.service";

export async function submitCloseoutFeedbackAction(
  applicationId: string,
  input: { hostAgain: string; note: string; privateNote: string; quality: string; reliability: string }
): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") return "Your session has expired. Sign in again.";
  try {
    await submitPartnerCloseoutFeedback(
      applicationId,
      { ...input, privateNote: input.privateNote || null },
      resolution.actor
    );
  } catch (error) {
    if (error instanceof MilestoneReviewError) {
      return error.code === "NOT_FOUND" ? "That project is no longer available to you." : error.message;
    }
    throw error;
  }
  revalidatePath(`/partner/projects/${applicationId}`);
  revalidatePath(`/workspace/${applicationId}`);
  return null;
}
