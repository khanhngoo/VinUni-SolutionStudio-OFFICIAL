"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  MilestoneReviewError,
  recordPartnerMilestoneReview,
} from "@/services/milestone-review.service";

export async function approveMilestoneAsPartner(
  milestoneId: string
): Promise<string | null> {
  return review(milestoneId, "APPROVED", null);
}

export async function requestMilestoneRevision(
  milestoneId: string,
  comments: string
): Promise<string | null> {
  const trimmed = comments.trim();
  if (trimmed === "") {
    return "Say what needs changing — the team sees this verbatim.";
  }

  return review(milestoneId, "REVISION_REQUESTED", trimmed);
}

async function review(
  milestoneId: string,
  decision: "APPROVED" | "REVISION_REQUESTED",
  comments: string | null
) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await recordPartnerMilestoneReview(
      BigInt(milestoneId),
      decision,
      comments,
      resolution.actor
    );
  } catch (error) {
    if (error instanceof MilestoneReviewError) {
      return error.code === "NOT_FOUND"
        ? "That milestone is no longer available to you."
        : error.message;
    }
    throw error;
  }

  revalidatePath("/partner/projects");
  return null;
}
