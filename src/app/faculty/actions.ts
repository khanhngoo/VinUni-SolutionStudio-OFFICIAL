"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  MilestoneReviewError,
  recordFacultyMilestoneReview,
} from "@/services/milestone-review.service";
import {
  SupervisionError,
  respondToSupervisionRequest,
} from "@/services/supervision.service";

/**
 * Faculty queue writes.
 *
 * Each returns an error message rather than throwing, because the queue
 * removes the row optimistically: a thrown error would leave the screen
 * claiming an action succeeded. A returned message puts the row back.
 */
export async function acceptSupervisionRequest(requestId: string): Promise<string | null> {
  return respond(requestId, "ACCEPT");
}

export async function declineSupervisionRequest(requestId: string): Promise<string | null> {
  return respond(requestId, "DECLINE");
}

async function respond(requestId: string, decision: "ACCEPT" | "DECLINE") {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again.";
  }

  try {
    await respondToSupervisionRequest(BigInt(requestId), decision, resolution.actor);
  } catch (error) {
    if (error instanceof SupervisionError) return error.message;
    throw error;
  }

  revalidatePath("/faculty");
  return null;
}

export async function approveMilestone(milestoneId: string): Promise<string | null> {
  return review(milestoneId, "APPROVED", null);
}

export async function requestMilestoneChanges(
  milestoneId: string,
  comments: string
): Promise<string | null> {
  const trimmed = comments.trim();
  if (trimmed === "") {
    return "Say what needs changing — the team only sees what you write here.";
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
    await recordFacultyMilestoneReview(
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

  revalidatePath("/faculty");
  return null;
}
