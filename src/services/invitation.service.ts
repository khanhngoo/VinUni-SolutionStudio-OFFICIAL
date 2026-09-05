import { db } from "@/db";
import {
  respondToTeamInvitation,
  type InvitationMutationDatabase,
} from "@/db/mutations/invitations";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";

export type InvitationErrorCode = "CONFLICT" | "FORBIDDEN";

export class InvitationError extends Error {
  readonly code: InvitationErrorCode;

  constructor(code: InvitationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "InvitationError";
  }
}

export interface InvitationServiceOptions {
  database?: InvitationMutationDatabase;
  now?: Date;
}

/**
 * Accepts or declines a team invitation.
 *
 * The invitee answers for themselves and nobody else: the membership is
 * matched on the actor's own student id, so there is no id in the request that
 * could be swapped for someone else's seat.
 */
export async function respondToInvitation(
  applicationPublicId: string,
  decision: "ACCEPT" | "DECLINE",
  actor: AuthenticatedActor,
  options: InvitationServiceOptions = {}
): Promise<void> {
  if (!actor.studentProfile) {
    throw new InvitationError(
      "FORBIDDEN",
      "Only a student account can answer a team invitation."
    );
  }

  const database = options.database ?? db;
  const answered = await respondToTeamInvitation(database, {
    applicationPublicId,
    now: options.now ?? new Date(),
    status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
    studentId: actor.user.userId,
  });

  if (!answered) {
    throw new InvitationError(
      "CONFLICT",
      "This invitation is no longer waiting on you."
    );
  }
}
