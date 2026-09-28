import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  assessments,
  challenges,
  selections,
} from "@/db/schema";
import {
  getApplicationWriteSubjectById,
  getApplicationWriteSubjectByPublicId,
  lockApplicationForLifecycle,
  selectApplicationMembers,
  updateApplicationStatus,
  type ApplicationMutationDatabase,
} from "@/db/mutations/applications";
import { listSupervisionRequestsForWrite } from "@/db/mutations/supervision";
import { isPublicId } from "@/lib/public-id";
import type { ApplicationActorContext } from "@/services/application.service";

export type ApplicationLifecycleBlock =
  | "ASSESSMENT_AWAITING_REVIEW"
  | "ASSESSMENT_IN_PROGRESS"
  | "ASSESSMENT_NOT_STARTED"
  | "ASSESSMENT_RESULT_MISSING"
  | "INVITATIONS_PENDING"
  | "NONE"
  | "SUPERVISION_ACCEPTED"
  | "SUPERVISION_AWAITING_REROUTE"
  | "SUPERVISION_PENDING"
  | "TEAM_BELOW_MINIMUM"
  | "TERMINAL";

export interface ApplicationLifecycleView {
  block: ApplicationLifecycleBlock;
  canWithdraw: boolean;
  message: string;
  terminal: boolean;
}

interface ApplicationLifecycleRead {
  activeAssessment: { id: bigint } | null;
  assessmentSummaries: Array<{
    attemptStatus: string;
    hasReviewedResult: boolean;
  }>;
  members: Array<{ memberRole: string; status: string }>;
  offerSummary: unknown | null;
  projectSummary: unknown | null;
  status: string;
  supervisionRequests: Array<{
    respondBy: Date | null;
    status: string;
  }>;
}

export class ApplicationLifecycleError extends Error {
  constructor(
    public readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "INVALID_TRANSITION"
      | "NOT_FOUND",
    message: string
  ) {
    super(message);
    this.name = "ApplicationLifecycleError";
  }
}

interface LifecycleOptions {
  database?: ApplicationMutationDatabase;
  now?: Date;
}

const WITHDRAWABLE_STATUSES = new Set([
  "SUBMITTED",
  "SHORTLISTED",
  "ASSESSMENT",
  "SELECTION_PENDING",
]);

/**
 * Shared read model for student, partner and internal-facing application UI.
 * It never invents a status from dates: the persisted application status is
 * authoritative, while dates/results explain why that status is blocked.
 */
export function deriveApplicationLifecycleView(
  application: ApplicationLifecycleRead,
  actorIsAcceptedLeader = false,
  now = new Date()
): ApplicationLifecycleView {
  const canWithdraw =
    actorIsAcceptedLeader &&
    WITHDRAWABLE_STATUSES.has(application.status) &&
    !application.offerSummary &&
    !application.projectSummary;

  if (application.status === "WITHDRAWN") {
    return {
      block: "TERMINAL",
      canWithdraw: false,
      message: "This application was withdrawn and is read-only.",
      terminal: true,
    };
  }
  if (application.status === "REJECTED") {
    return {
      block: "TERMINAL",
      canWithdraw: false,
      message: "This application was not successful and is read-only.",
      terminal: true,
    };
  }
  if (application.status === "SELECTED" || application.offerSummary) {
    return {
      block: "NONE",
      canWithdraw: false,
      message: "Selection is complete. Any later decline or cancellation belongs to the offer workflow.",
      terminal: false,
    };
  }
  if (application.status === "SELECTION_PENDING") {
    return {
      block: "NONE",
      canWithdraw,
      message: "All current application gates are complete. Awaiting partner selection.",
      terminal: false,
    };
  }

  if (application.status === "ASSESSMENT") {
    const summaries = application.assessmentSummaries;
    if (!application.activeAssessment) {
      return {
        block: "ASSESSMENT_RESULT_MISSING",
        canWithdraw,
        message: "Assessment is required, but no active assessment is available. The application cannot progress.",
        terminal: false,
      };
    }
    if (summaries.length === 0) {
      return {
        block: "ASSESSMENT_NOT_STARTED",
        canWithdraw,
        message: "Assessment is ready and must be completed before selection.",
        terminal: false,
      };
    }
    if (summaries.some((summary) => summary.attemptStatus === "IN_PROGRESS")) {
      return {
        block: "ASSESSMENT_IN_PROGRESS",
        canWithdraw,
        message: "Assessment is in progress. An attempt alone is not a passing result.",
        terminal: false,
      };
    }
    if (
      summaries.some(
        (summary) =>
          summary.attemptStatus === "SUBMITTED" ||
          (summary.attemptStatus === "REVIEWED" && !summary.hasReviewedResult)
      )
    ) {
      return {
        block: "ASSESSMENT_AWAITING_REVIEW",
        canWithdraw,
        message: "Assessment submitted. Awaiting an authoritative reviewed result.",
        terminal: false,
      };
    }
    return {
      block: "ASSESSMENT_RESULT_MISSING",
      canWithdraw,
      message: "Assessment review is incomplete. Missing or unknown results never count as a pass.",
      terminal: false,
    };
  }

  if (application.members.some((member) => member.status === "INVITED")) {
    return {
      block: "INVITATIONS_PENDING",
      canWithdraw,
      message: "Waiting for invited team members to respond.",
      terminal: false,
    };
  }

  const accepted = application.supervisionRequests.some(
    (request) => request.status === "ACCEPTED"
  );
  if (accepted) {
    return {
      block: "SUPERVISION_ACCEPTED",
      canWithdraw,
      message: "Supervision is accepted. The application is ready for its next required gate.",
      terminal: false,
    };
  }
  const effectivePending = application.supervisionRequests.some(
    (request) =>
      request.status === "PENDING" &&
      request.respondBy !== null &&
      now <= request.respondBy
  );
  if (effectivePending) {
    return {
      block: "SUPERVISION_PENDING",
      canWithdraw,
      message: "Waiting for the nominated faculty supervisor to respond.",
      terminal: false,
    };
  }
  if (application.supervisionRequests.length > 0) {
    return {
      block: "SUPERVISION_AWAITING_REROUTE",
      canWithdraw,
      message: "Supervision was declined or expired. The leader must nominate another supervisor.",
      terminal: false,
    };
  }

  return {
    block: "NONE",
    canWithdraw,
    message: "Application submitted and awaiting internal review.",
    terminal: false,
  };
}

/**
 * Reconciles only the supervision/team gate. It is deliberately not a generic
 * status setter and does not accept a next status from a browser. Assessment
 * outcome writes remain owned by Phase 6.6.5.
 */
export async function progressApplicationAfterGateChange(
  applicationId: bigint,
  options: LifecycleOptions = {}
): Promise<{ progressed: boolean; status: string }> {
  return withLifecycleTransaction(options.database ?? db, async (tx) => {
    await lockApplicationForLifecycle(tx, applicationId);
    const application = await getApplicationWriteSubjectById(tx, applicationId);
    if (!application) throw new ApplicationLifecycleError("NOT_FOUND", "Application was not found.");

    if (application.status !== "SUBMITTED") {
      return { progressed: false, status: application.status };
    }

    const members = await selectApplicationMembers(tx, application.id);
    const acceptedLeaders = members.filter(
      (member) => member.memberRole === "LEADER" && member.status === "ACCEPTED"
    );
    if (acceptedLeaders.length !== 1) {
      throw new ApplicationLifecycleError(
        "CONFLICT",
        "Application must have exactly one accepted leader before it can progress."
      );
    }
    if (members.some((member) => member.status === "INVITED")) {
      return { progressed: false, status: application.status };
    }

    const [teamRule] = await tx
      .select({ max: challenges.teamSizeMax, min: challenges.teamSizeMin })
      .from(challenges)
      .where(eq(challenges.id, application.challengeId))
      .limit(1);
    const acceptedCount = members.filter((member) => member.status === "ACCEPTED").length;
    if (
      !teamRule ||
      acceptedCount < (teamRule.min ?? 1) ||
      (teamRule.max !== null && acceptedCount > teamRule.max)
    ) {
      return { progressed: false, status: application.status };
    }

    const supervision = await listSupervisionRequestsForWrite(tx, application.id);
    if (!supervision.some((request) => request.status === "ACCEPTED")) {
      return { progressed: false, status: application.status };
    }

    const activeAssessments = await tx
      .select({ id: assessments.id })
      .from(assessments)
      .where(
        and(
          eq(assessments.challengeId, application.challengeId),
          eq(assessments.status, "ACTIVE")
        )
      )
      .limit(2);
    if (activeAssessments.length > 1) {
      throw new ApplicationLifecycleError(
        "CONFLICT",
        "Multiple active assessments exist for this challenge."
      );
    }

    const nextStatus = activeAssessments.length === 1 ? "ASSESSMENT" : "SELECTION_PENDING";
    const updated = await updateApplicationStatus(
      tx,
      application.id,
      ["SUBMITTED"],
      nextStatus,
      options.now
    );
    if (!updated) {
      throw new ApplicationLifecycleError(
        "CONFLICT",
        "Application changed while its gates were being reconciled."
      );
    }
    return { progressed: true, status: nextStatus };
  });
}

/** Leader-only, whole-application withdrawal while the application is pre-selection. */
export async function withdrawApplication(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: LifecycleOptions = {}
): Promise<void> {
  if (!isPublicId(applicationPublicId)) {
    throw new ApplicationLifecycleError("NOT_FOUND", "Application was not found.");
  }

  await withLifecycleTransaction(options.database ?? db, async (tx) => {
    const initial = await getApplicationWriteSubjectByPublicId(
      tx,
      applicationPublicId.trim()
    );
    if (!initial) throw new ApplicationLifecycleError("NOT_FOUND", "Application was not found.");

    await lockApplicationForLifecycle(tx, initial.id);
    const application = await getApplicationWriteSubjectById(tx, initial.id);
    if (!application) throw new ApplicationLifecycleError("NOT_FOUND", "Application was not found.");

    const members = await selectApplicationMembers(tx, application.id);
    const leader = members.find(
      (member) => member.memberRole === "LEADER" && member.status === "ACCEPTED"
    );
    if (!leader || leader.studentId !== actor.userId) {
      throw new ApplicationLifecycleError(
        "FORBIDDEN",
        "Only the accepted application leader can withdraw the whole application."
      );
    }

    // A repeated request from the same leader is an idempotent success.
    if (application.status === "WITHDRAWN") return;
    if (!WITHDRAWABLE_STATUSES.has(application.status)) {
      throw new ApplicationLifecycleError(
        "INVALID_TRANSITION",
        "This application can no longer be withdrawn."
      );
    }

    const [selection] = await tx
      .select({ id: selections.id })
      .from(selections)
      .where(eq(selections.applicationId, application.id))
      .limit(1);
    if (selection) {
      throw new ApplicationLifecycleError(
        "INVALID_TRANSITION",
        "Selection has already started; use the downstream offer workflow instead."
      );
    }

    const updated = await updateApplicationStatus(
      tx,
      application.id,
      [application.status],
      "WITHDRAWN",
      options.now
    );
    if (!updated) {
      throw new ApplicationLifecycleError(
        "CONFLICT",
        "Application changed before withdrawal could be saved."
      );
    }
  });
}

async function withLifecycleTransaction<T>(
  database: ApplicationMutationDatabase,
  callback: (tx: ApplicationMutationDatabase) => Promise<T>
) {
  if ("rollback" in database && typeof database.rollback === "function") {
    return callback(database);
  }
  return database.transaction((tx) => callback(tx));
}
