"use server";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveStudentEmailsByUserId } from "@/db/queries/students";
import { db } from "@/db";
import {
  ApplicationError,
  createApplication,
  toApplicationActorContext,
} from "@/services/application.service";

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT:
    "You or a proposed teammate already has an active application for this challenge.",
  FORBIDDEN: "Only signed-in student accounts can submit applications.",
  INVALID_TRANSITION: "This challenge is not accepting applications right now.",
  NOT_FOUND: "This challenge is no longer available.",
  VALIDATION_ERROR: "Please check the application details and try again.",
};

export interface SubmitApplicationInput {
  challengeSlug: string;
  committedHoursPerWeek: number;
  /** User ids picked in the wizard's first step. */
  invitedStudentIds: string[];
  motivation: string;
  relevantExperience: string;
  teamName: string;
}

/**
 * Submits an application from the wizard.
 *
 * Returns an error message rather than throwing or redirecting, because the
 * wizard holds four steps of unsaved state: a redirect would discard
 * everything the student typed in order to show them one sentence. The
 * previous flat form could afford `?error=` in the URL; this cannot.
 *
 * The wizard already ran `validateAll` client-side. That is a convenience, not
 * a control — `createApplication` re-validates team shape, eligibility and
 * duplicate membership server-side, and this only translates its typed errors
 * into something a person can read.
 */
export async function submitApplicationDraft(
  input: SubmitApplicationInput
): Promise<string | null> {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") {
    return "Your session has expired. Sign in again and resubmit.";
  }

  const actor = toApplicationActorContext(resolution.actor);

  // The picker invites by id and never sees an email; the mapping happens
  // here. An id that does not resolve to an active student is rejected rather
  // than silently dropped, so a stale picker cannot quietly shrink the team.
  let emailsById: Map<string, string>;
  try {
    emailsById = await resolveStudentEmailsByUserId(
      db,
      input.invitedStudentIds.map((id) => BigInt(id))
    );
  } catch {
    return "One of the students you invited could not be found.";
  }

  if (emailsById.size !== new Set(input.invitedStudentIds).size) {
    return "One of the students you invited is no longer available.";
  }

  try {
    await createApplication(
      {
        challengeSlug: input.challengeSlug,
        leaderAvailabilityConfirmed: true,
        leaderCommittedHoursPerWeek: input.committedHoursPerWeek,
        members: input.invitedStudentIds.map((id) => ({
          status: "INVITED" as const,
          studentEmail: emailsById.get(id) ?? "",
        })),
        motivation: input.motivation,
        relevantExperience: input.relevantExperience || null,
        teamName: input.teamName,
      },
      actor
    );
  } catch (error) {
    if (error instanceof ApplicationError) {
      const detail = error.details?.length ? ` ${error.details.join(" ")}` : "";
      return `${ERROR_MESSAGES[error.code] ?? "The application could not be submitted."}${detail}`;
    }

    throw error;
  }

  return null;
}
