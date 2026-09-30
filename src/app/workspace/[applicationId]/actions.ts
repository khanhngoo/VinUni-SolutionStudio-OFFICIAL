"use server";

import { revalidatePath } from "next/cache";

import { getAuthenticatedActor, type AuthenticatedActor } from "@/auth/authenticated-actor";
import {
  MilestoneReviewError,
  createProjectMilestone,
  recordFacultyMilestoneReview,
  recordFinalProjectReview,
  recordPartnerMilestoneReview,
  submitMilestoneWork,
  type MilestoneSubmissionInput,
} from "@/services/milestone-review.service";

/**
 * Project-work writes from the shared workspace. Each re-resolves the actor;
 * the service derives every authority (member, supervisor, owner partner)
 * from persisted rows. The `role` a form posts only selects which authority
 * to check — it can never grant one.
 */
async function run(applicationId: string, write: (actor: AuthenticatedActor) => Promise<unknown>) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") return "Your session has expired. Sign in again.";
  try {
    await write(resolution.actor);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) {
      return "That item is no longer available to you.";
    }
    if (error instanceof MilestoneReviewError) {
      return error.code === "NOT_FOUND" ? "That item is no longer available to you." : error.message;
    }
    throw error;
  }
  revalidatePath(`/workspace/${applicationId}`);
  return null;
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function side(formData: FormData): "FACULTY" | "PARTNER" {
  return text(formData, "role") === "FACULTY" ? "FACULTY" : "PARTNER";
}

function decision(formData: FormData): "APPROVED" | "REVISION_REQUESTED" {
  return text(formData, "decision") === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "APPROVED";
}

export async function createMilestoneAction(applicationId: string, formData: FormData) {
  return run(applicationId, (actor) =>
    createProjectMilestone(
      applicationId,
      {
        deadline: text(formData, "deadline") || null,
        description: text(formData, "description") || null,
        title: text(formData, "title"),
      },
      actor
    )
  );
}

export async function submitWorkAction(applicationId: string, formData: FormData) {
  return run(applicationId, (actor) =>
    submitMilestoneWork(
      BigInt(text(formData, "milestoneId")),
      {
        deliverableType: text(formData, "deliverableType") as MilestoneSubmissionInput["deliverableType"],
        description: text(formData, "description") || null,
        title: text(formData, "title"),
        url: text(formData, "url") || null,
      },
      actor
    )
  );
}

export async function reviewMilestoneAction(applicationId: string, formData: FormData) {
  const record = side(formData) === "FACULTY" ? recordFacultyMilestoneReview : recordPartnerMilestoneReview;
  return run(applicationId, (actor) =>
    record(
      BigInt(text(formData, "milestoneId")),
      BigInt(text(formData, "submissionId")),
      decision(formData),
      text(formData, "comments") || null,
      actor
    )
  );
}

export async function finalReviewAction(applicationId: string, formData: FormData) {
  const round = Number(text(formData, "round"));
  return run(applicationId, (actor) =>
    recordFinalProjectReview(applicationId, side(formData), decision(formData), text(formData, "comments") || null, actor, {
      expectedRound: Number.isInteger(round) && round > 0 ? round : undefined,
    })
  );
}
