import { db } from "@/db";
import { getFacultyCapacity } from "@/db/queries/faculty";
import {
  countActiveSupervisions,
  respondToPendingSupervisionRequest,
  type SupervisionMutationDatabase,
} from "@/db/mutations/supervision";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";

export type SupervisionErrorCode =
  | "AT_CAPACITY"
  | "CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND";

export class SupervisionError extends Error {
  readonly code: SupervisionErrorCode;

  constructor(code: SupervisionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SupervisionError";
  }
}

export interface SupervisionServiceOptions {
  database?: SupervisionMutationDatabase;
  now?: Date;
}

/**
 * Accepts or declines a supervision request.
 *
 * Capacity is checked inside the same transaction as the write and counted
 * from the projects table rather than from a stored tally, so a supervisor
 * cannot slip past their limit by answering two requests at once.
 *
 * Declining is never blocked by capacity — a supervisor who is full still has
 * to be able to say no.
 */
export async function respondToSupervisionRequest(
  requestId: bigint,
  decision: "ACCEPT" | "DECLINE",
  actor: AuthenticatedActor,
  options: SupervisionServiceOptions = {}
): Promise<void> {
  if (!actor.facultyProfile) {
    throw new SupervisionError(
      "FORBIDDEN",
      "Only a faculty account can answer a supervision request."
    );
  }

  const now = options.now ?? new Date();
  const facultyId = actor.user.userId;

  const run = async (tx: SupervisionMutationDatabase) => {
    if (decision === "ACCEPT") {
      const [capacity, active] = await Promise.all([
        getFacultyCapacity(tx, facultyId),
        countActiveSupervisions(tx, facultyId),
      ]);

      const limit = capacity?.maxActiveSupervisions ?? null;
      if (limit !== null && active >= limit) {
        throw new SupervisionError(
          "AT_CAPACITY",
          `You are supervising ${active} of ${limit} projects and cannot take on another.`
        );
      }
    }

    const answered = await respondToPendingSupervisionRequest(tx, {
      facultyId,
      now,
      requestId,
      status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
    });

    if (!answered) {
      throw new SupervisionError(
        "CONFLICT",
        "This request is no longer awaiting your response."
      );
    }
  };

  // Only open a transaction when we own the connection; a caller that passed
  // one in is already inside theirs.
  if (options.database) {
    await run(options.database);
    return;
  }

  await db.transaction(async (tx) => {
    await run(tx);
  });
}
