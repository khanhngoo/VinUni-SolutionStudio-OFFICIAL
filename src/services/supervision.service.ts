import { db } from "@/db";
import {
  getFacultyCapacity,
  listFacultySupervisionRequests,
} from "@/db/queries/faculty";
import {
  countActiveSupervisions,
  respondToPendingSupervisionRequest,
  type SupervisionMutationDatabase,
} from "@/db/mutations/supervision";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { progressApplicationAfterGateChange } from "@/services/application-lifecycle.service";

export type SupervisionErrorCode =
  | "AT_CAPACITY"
  | "CONFLICT"
  | "DEADLINE_EXPIRED"
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
    const request = await findFacultyRequest(tx, facultyId, requestId);
    if (request?.status === "PENDING") {
      if (!request.respondBy) {
        throw new SupervisionError(
          "CONFLICT",
          "This request has no response deadline and is read-only. Ask the student to issue a fresh request."
        );
      }
      if (now > request.respondBy) {
        throw new SupervisionError(
          "DEADLINE_EXPIRED",
          "The response deadline has passed. This request is now read-only."
        );
      }
    }

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

    if (decision === "ACCEPT") {
      await progressApplicationAfterGateChange(answered.applicationId, {
        database: tx,
        now,
      });
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

async function findFacultyRequest(
  database: SupervisionMutationDatabase,
  facultyId: bigint,
  requestId: bigint
) {
  const requests = await listFacultySupervisionRequests(database, facultyId);
  return requests.find((request) => request.id === requestId) ?? null;
}
