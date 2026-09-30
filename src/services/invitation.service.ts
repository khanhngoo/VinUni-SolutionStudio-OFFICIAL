import { db } from "@/db";
import {
  getInvitationWriteSubject,
  respondToTeamInvitation,
  type InvitationMutationDatabase,
} from "@/db/mutations/invitations";
import {
  findDuplicateApplicationMemberships,
  lockApplicationForLifecycle,
  lockEffectiveApplicationParticipants,
} from "@/db/mutations/applications";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { progressApplicationAfterGateChange } from "@/services/application-lifecycle.service";

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

  const now = options.now ?? new Date();
  const run = async (tx: InvitationMutationDatabase) => {
    let subject = await getInvitationWriteSubject(
      tx,
      applicationPublicId,
      actor.user.userId
    );
    if (!subject || subject.memberStatus !== "INVITED") {
      throw new InvitationError(
        "CONFLICT",
        "This invitation is no longer waiting on you."
      );
    }

    if (decision === "ACCEPT") {
      await lockEffectiveApplicationParticipants(tx, subject.challengeId, [
        actor.user.userId,
      ]);
    }
    await lockApplicationForLifecycle(tx, subject.applicationId);
    subject = await getInvitationWriteSubject(
      tx,
      applicationPublicId,
      actor.user.userId
    );
    if (
      !subject ||
      subject.memberStatus !== "INVITED" ||
      !["SUBMITTED", "SHORTLISTED", "ASSESSMENT", "SELECTION_PENDING"].includes(
        subject.applicationStatus
      )
    ) {
      throw new InvitationError(
        "CONFLICT",
        "This invitation is no longer waiting on you."
      );
    }

    if (decision === "ACCEPT") {
      const conflicts = await findDuplicateApplicationMemberships(
        tx,
        subject.challengeId,
        [actor.user.userId],
        subject.applicationId
      );
      if (conflicts.length > 0) {
        throw new InvitationError(
          "CONFLICT",
          "You already participate in another active application for this challenge."
        );
      }
    }

    const answered = await respondToTeamInvitation(tx, {
      applicationPublicId,
      now,
      status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
      studentId: actor.user.userId,
    });
    if (!answered) {
      throw new InvitationError(
        "CONFLICT",
        "This invitation is no longer waiting on you."
      );
    }

    await progressApplicationAfterGateChange(answered.applicationId, {
      database: tx,
      now,
    });
  };

  const database = options.database ?? db;
  if ("rollback" in database && typeof database.rollback === "function") {
    await run(database);
  } else {
    await database.transaction((tx) => run(tx));
  }
}
