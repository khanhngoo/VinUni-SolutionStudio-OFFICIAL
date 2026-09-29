import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { agreements, challenges } from "@/db/schema";
import {
  getOfferByApplicationPublicId,
  getOfferMember,
  type OfferRead,
  type OfferRuntimeStatus,
} from "@/db/queries/offers";
import {
  insertSelectionAndOffer,
  respondToPendingOffer,
  type OfferMutationDatabase,
} from "@/db/mutations/offers";
import {
  insertProjectForApplication,
  insertProjectMembersFromAcceptedApplicationMembers,
  selectProjectByApplicationId,
} from "@/db/mutations/projects";
import { listSupervisionRequestsForWrite } from "@/db/mutations/supervision";
import {
  getApplicationWriteSubjectById,
  getApplicationWriteSubjectByPublicId,
  lockApplicationForLifecycle,
  selectApplicationMembers,
  updateApplicationStatus,
} from "@/db/mutations/applications";
import {
  getDevelopmentApplicationActor,
  type ApplicationActorContext,
  type DevelopmentApplicationActorKey,
} from "@/services/application.service";
import { isPublicId } from "@/lib/public-id";
import { addCampusWorkingDays } from "@/lib/dates";
import {
  hasOneOfActiveOrganizationRoles,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";

export type OfferErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class OfferError extends Error {
  constructor(
    public readonly code: OfferErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "OfferError";
  }
}

export type OfferResponse = "ACCEPT" | "DECLINE";

export interface OfferServiceDetail {
  application: {
    publicId: string;
    status: string;
    teamName: string | null;
  };
  canRespond: boolean;
  challenge: {
    managingOrganizationName: string;
    ownerOrganizationName: string;
    slug: string;
    subtype: string | null;
    summary: string;
    title: string;
  };
  offer: {
    createdAt: Date | null;
    isExpired: boolean;
    remainingHours: number | null;
    respondedAt: Date | null;
    respondedByName: string | null;
    respondBy: Date | null;
    status: OfferRuntimeStatus;
    terms: OfferRead["terms"];
  };
  selection: {
    selectedAt: Date | null;
  };
}

interface OfferServiceOptions {
  database?: OfferMutationDatabase;
  /** Verification-only fault injection; server actions never pass these. */
  injectFailureAfterOfferResponse?: () => Promise<void> | void;
  injectFailureAfterProjectInsert?: () => Promise<void> | void;
  now?: Date;
}

interface OfferContext {
  member: NonNullable<Awaited<ReturnType<typeof getOfferMember>>>;
  offer: OfferRead;
}

export async function getDevelopmentOfferActor(
  key: DevelopmentApplicationActorKey,
  options: OfferServiceOptions = {}
): Promise<ApplicationActorContext> {
  return getDevelopmentApplicationActor(key, options);
}

export async function getOfferDetail(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: OfferServiceOptions = {}
): Promise<OfferServiceDetail | null> {
  const context = await loadOfferContext(applicationPublicId, actor, options);
  if (!context) return null;
  return toServiceDetail(context, options.now ?? new Date());
}

export async function respondToOffer(
  applicationPublicId: string,
  response: OfferResponse,
  actor: ApplicationActorContext,
  options: OfferServiceOptions = {}
): Promise<OfferServiceDetail> {
  const database = options.database ?? db;
  const now = options.now ?? new Date();

  return withOfferTransaction(database, async (tx) => {
    const initial = await loadOfferContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!initial) throw notFound("Offer was not found.");

    // The same application lock selection, withdrawal and lifecycle writes
    // use: a second tab, a double-click, or an accept racing a decline waits
    // here and then re-reads the committed outcome instead of racing it.
    await lockApplicationForLifecycle(tx, initial.offer.application.id);
    const context = await loadOfferContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!context) throw notFound("Offer was not found.");
    assertAcceptedLeader(context);

    const requested = response === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const applicationId = context.offer.application.id;

    if (context.offer.status !== "PENDING") {
      // Replay of the response already on record is idempotent; anything
      // else would overwrite a terminal decision and is refused.
      const replay =
        context.offer.status === requested &&
        (requested === "DECLINED" ||
          (await selectProjectByApplicationId(tx, applicationId)) !== null);
      if (replay) return toServiceDetail(context, now);
      throw new OfferError("INVALID_TRANSITION", "Offer has already been resolved.");
    }
    if (isExpired(context.offer, now)) {
      throw new OfferError("INVALID_TRANSITION", "Offer response window has expired.");
    }
    if (
      requested === "ACCEPTED" &&
      (await selectProjectByApplicationId(tx, applicationId)) !== null
    ) {
      throw new OfferError(
        "CONFLICT",
        "A project already exists for this application while its offer is still pending."
      );
    }

    const updated = await respondToPendingOffer(tx, {
      now,
      offerId: context.offer.id,
      respondedBy: actor.userId,
      status: requested,
    });
    if (!updated) {
      throw new OfferError(
        "CONFLICT",
        "Offer response could not be recorded because the offer is no longer pending."
      );
    }
    await options.injectFailureAfterOfferResponse?.();

    if (requested === "ACCEPTED") {
      await provisionProjectForAcceptedOffer(tx, context, actor.userId, now, options);
    }

    const result = await loadOfferContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!result) throw new OfferError("CONFLICT", "Responded offer could not be read.");
    return toServiceDetail(result, now);
  });
}

/**
 * One project per accepted application, membered only by the application's
 * ACCEPTED members, supervised by the faculty member whose supervision
 * request was ACCEPTED. The supervisor is never taken from input. Runs inside
 * the acceptance transaction, so any failure here also undoes the ACCEPTED
 * offer response.
 */
async function provisionProjectForAcceptedOffer(
  tx: OfferMutationDatabase,
  context: OfferContext,
  leaderId: bigint,
  now: Date,
  options: OfferServiceOptions
) {
  const applicationId = context.offer.application.id;

  const acceptedSupervision = (await listSupervisionRequestsForWrite(tx, applicationId)).filter(
    (request) => request.status === "ACCEPTED"
  );
  if (acceptedSupervision.length > 1) {
    throw new OfferError(
      "CONFLICT",
      "More than one accepted supervisor is on record for this application."
    );
  }

  const project = await insertProjectForApplication(tx, {
    applicationId,
    facultySupervisorId: acceptedSupervision[0]?.facultyId ?? null,
    now,
    startDate: context.offer.terms.startDate,
  });
  if (!project) {
    throw new OfferError("CONFLICT", "A project already exists for this application.");
  }
  await options.injectFailureAfterProjectInsert?.();

  const members = await insertProjectMembersFromAcceptedApplicationMembers(tx, {
    applicationId,
    now,
    projectId: project.id,
  });
  if (!members.some((member) => member.studentId === leaderId)) {
    throw new OfferError(
      "CONFLICT",
      "The accepted leader could not be added to the new project."
    );
  }
}

const OWNER_SELECTION_ROLES = ["ADMIN", "CONTACT_PERSON"] as const;
const START_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface SelectionOfferInput {
  compensationNote?: string | null;
  durationWeeks?: number | null;
  hoursPerWeek?: number | null;
  ndaRequired?: boolean;
  /** Working days from now until the offer is no longer PENDING-respondable. */
  respondByWorkingDays?: number;
  startDate?: string | null;
}

export interface SelectionOfferIssueResult {
  /** True when this call read back an already-durable selection/offer rather than creating one. */
  alreadyIssued: boolean;
  applicationPublicId: string;
  offerId: bigint;
  respondBy: Date | null;
  selectionId: bigint;
}

/**
 * The partner-side counterpart to `respondToOffer`: an authorized owner
 * decision, not a browser-only shortlist pick. `SELECTION_PENDING` is
 * trusted as-is — it already means every upstream gate (team, supervision,
 * assessment) cleared through the Phase 6.6.4/6.6.5 lifecycle machinery, so
 * this function does not re-derive eligibility or assessment outcomes.
 */
export async function issueSelectionOffer(
  applicationPublicId: string,
  input: SelectionOfferInput,
  actor: AuthenticatedActor,
  options: OfferServiceOptions = {}
): Promise<SelectionOfferIssueResult> {
  if (!isPublicId(applicationPublicId)) throw notFound("Application was not found.");

  const database = options.database ?? db;
  const now = options.now ?? new Date();

  const respondByWorkingDays = input.respondByWorkingDays ?? 5;
  if (!Number.isInteger(respondByWorkingDays) || respondByWorkingDays < 1) {
    throw new OfferError(
      "VALIDATION_ERROR",
      "Response deadline must be at least one working day from now."
    );
  }
  const hoursPerWeek = normalizePositiveInt(input.hoursPerWeek, "Hours per week");
  const durationWeeks = normalizePositiveInt(input.durationWeeks, "Duration in weeks");
  const startDate = normalizeStartDate(input.startDate);
  const compensationNote = input.compensationNote?.trim() ? input.compensationNote.trim() : null;
  const ndaRequired = input.ndaRequired ?? false;
  // Date-granular by construction (see `addCampusWorkingDays`), so two calls
  // on the same calendar day with the same `respondByWorkingDays` always
  // agree — this is what makes it safe to use as part of a same-terms check
  // for a retry, rather than only comparing the caller-submitted inputs.
  const respondBy = addCampusWorkingDays(now, respondByWorkingDays);

  return withOfferTransaction(database, async (tx) => {
    const initial = await getApplicationWriteSubjectByPublicId(tx, applicationPublicId.trim());
    if (!initial) throw notFound("Application was not found.");
    assertOwnerCanSelect(initial.ownerOrganizationId, actor);

    // Locked before any read this decision depends on, so a concurrent
    // double-click or second tab serializes behind this transaction rather
    // than racing it — the same shared lock Phase 6.6.4 uses for withdrawal
    // and invitation-driven progression.
    await lockApplicationForLifecycle(tx, initial.id);
    const application = await getApplicationWriteSubjectById(tx, initial.id);
    if (!application) throw notFound("Application was not found.");
    assertOwnerCanSelect(application.ownerOrganizationId, actor);

    if (application.status === "SELECTED") {
      const existingOffer = await getOfferByApplicationPublicId(tx, application.publicId);
      if (!existingOffer) {
        throw new OfferError(
          "CONFLICT",
          "Application is marked selected but its selection record could not be read."
        );
      }
      if (
        !offerTermsMatch(existingOffer, {
          compensationNote,
          durationWeeks,
          hoursPerWeek,
          ndaRequired,
          respondBy,
          startDate,
        })
      ) {
        throw new OfferError(
          "CONFLICT",
          "This application already has a durable offer with different terms. The existing offer was not changed."
        );
      }
      return {
        alreadyIssued: true,
        applicationPublicId: application.publicId,
        offerId: existingOffer.id,
        respondBy: existingOffer.respondBy,
        selectionId: existingOffer.selection.id,
      };
    }

    if (application.status !== "SELECTION_PENDING") {
      throw new OfferError(
        "INVALID_TRANSITION",
        "This application is not ready for selection."
      );
    }

    // Capacity: approved product decision (2026-09-28) is that this platform
    // does not impose "one selected application per challenge" — several
    // otherwise-valid applications for one challenge may each receive an
    // offer. Authoritative capacity is the already-modeled team-size range,
    // rechecked here against the application's current accepted roster.
    const members = await selectApplicationMembers(tx, application.id);
    const acceptedCount = members.filter((member) => member.status === "ACCEPTED").length;
    const [teamRule] = await tx
      .select({ max: challenges.teamSizeMax, min: challenges.teamSizeMin })
      .from(challenges)
      .where(eq(challenges.id, application.challengeId))
      .limit(1);
    if (
      teamRule &&
      (acceptedCount < (teamRule.min ?? 1) ||
        (teamRule.max !== null && acceptedCount > teamRule.max))
    ) {
      throw new OfferError(
        "CONFLICT",
        "The accepted team no longer matches this challenge's required team size."
      );
    }

    const created = await insertSelectionAndOffer(tx, {
      applicationId: application.id,
      compensationNote,
      durationWeeks,
      hoursPerWeek,
      ndaRequired,
      respondBy,
      selectedAt: now,
      selectedBy: actor.user.userId,
      startDate,
    });
    if (!created) {
      throw new OfferError(
        "CONFLICT",
        "A selection was already created for this application."
      );
    }

    const updated = await updateApplicationStatus(
      tx,
      application.id,
      ["SELECTION_PENDING"],
      "SELECTED",
      now
    );
    if (!updated) {
      throw new OfferError(
        "CONFLICT",
        "Application changed while the selection was being recorded."
      );
    }

    return {
      alreadyIssued: false,
      applicationPublicId: application.publicId,
      offerId: created.offerId,
      respondBy: created.respondBy,
      selectionId: created.selectionId,
    };
  });
}

function assertOwnerCanSelect(ownerOrganizationId: bigint, actor: AuthenticatedActor) {
  if (!hasOneOfActiveOrganizationRoles(actor, ownerOrganizationId, OWNER_SELECTION_ROLES)) {
    throw new OfferError(
      "FORBIDDEN",
      "Actor cannot select applications for this challenge."
    );
  }
}

function normalizePositiveInt(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value <= 0) {
    throw new OfferError("VALIDATION_ERROR", `${label} must be a positive whole number.`);
  }
  return value;
}

function normalizeStartDate(value: string | null | undefined) {
  if (!value) return null;
  if (!START_DATE_PATTERN.test(value)) {
    throw new OfferError("VALIDATION_ERROR", "Start date must be a valid date.");
  }
  return value;
}

/**
 * Distinguishes a replay-equivalent retry (same effective terms — safe to
 * report back as the same success) from a conflicting one (materially
 * different terms — must not be silently swapped in for the durable offer
 * a leader may already be looking at). `respondBy` is compared as computed,
 * not the caller's raw `respondByWorkingDays`, because that computation is
 * date-granular: two calls on the same day with the same working-day count
 * always agree, so a genuine difference here reflects a real input change.
 */
function offerTermsMatch(
  existing: OfferRead,
  candidate: {
    compensationNote: string | null;
    durationWeeks: number | null;
    hoursPerWeek: number | null;
    ndaRequired: boolean;
    respondBy: Date;
    startDate: string | null;
  }
) {
  return (
    existing.terms.compensationNote === candidate.compensationNote &&
    existing.terms.durationWeeks === candidate.durationWeeks &&
    existing.terms.hoursPerWeek === candidate.hoursPerWeek &&
    existing.terms.ndaRequired === candidate.ndaRequired &&
    existing.terms.startDate === candidate.startDate &&
    (existing.respondBy?.getTime() ?? null) === candidate.respondBy.getTime()
  );
}

async function loadOfferContext(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: OfferServiceOptions
): Promise<OfferContext | null> {
  assertStudentActor(actor);

  if (!isPublicId(applicationPublicId)) return null;

  const database = options.database ?? db;
  const offer = await getOfferByApplicationPublicId(
    database,
    applicationPublicId.trim()
  );
  if (!offer) return null;

  const member = await getOfferMember(database, offer.application.id, actor.userId);
  // Only accepted team members see offer terms; a declined or still-invited
  // invitee is isolated exactly like an unrelated student.
  if (!member || member.status !== "ACCEPTED") {
    throw new OfferError("FORBIDDEN", "Actor is not an accepted application member.");
  }

  return { member, offer };
}

function toServiceDetail(context: OfferContext, now: Date): OfferServiceDetail {
  const { offer } = context;
  return {
    application: {
      publicId: offer.application.publicId,
      status: offer.application.status,
      teamName: offer.application.teamName,
    },
    canRespond:
      context.member.memberRole === "LEADER" && context.member.status === "ACCEPTED",
    challenge: {
      managingOrganizationName: offer.challenge.managingOrganizationName,
      ownerOrganizationName: offer.challenge.ownerOrganizationName,
      slug: offer.challenge.slug,
      subtype: offer.challenge.subtype,
      summary: offer.challenge.summary,
      title: offer.challenge.title,
    },
    offer: {
      createdAt: offer.createdAt,
      isExpired: isExpired(offer, now),
      remainingHours: remainingHours(offer, now),
      respondedAt: offer.response.respondedAt,
      respondedByName: offer.response.respondedByName,
      respondBy: offer.respondBy,
      status: offer.status,
      terms: offer.terms,
    },
    selection: { selectedAt: offer.selection.selectedAt },
  };
}

function assertStudentActor(actor: ApplicationActorContext) {
  if (!actor.isStudent) {
    throw new OfferError(
      "FORBIDDEN",
      "Only student actors can access the student offer runtime."
    );
  }
}

function assertAcceptedLeader(context: OfferContext) {
  if (
    context.member.memberRole !== "LEADER" ||
    context.member.status !== "ACCEPTED"
  ) {
    throw new OfferError(
      "FORBIDDEN",
      "Only the accepted application leader can respond to the team offer."
    );
  }
}

function isExpired(offer: OfferRead, now: Date) {
  return offer.status === "PENDING" && offer.respondBy !== null && offer.respondBy < now;
}

function remainingHours(offer: OfferRead, now: Date) {
  if (offer.status !== "PENDING" || !offer.respondBy) return null;
  return Math.max(0, Math.ceil((offer.respondBy.getTime() - now.getTime()) / 3_600_000));
}

async function withOfferTransaction<T>(
  database: OfferMutationDatabase,
  callback: (tx: OfferMutationDatabase) => Promise<T>
) {
  if (!isTransaction(database)) {
    return database.transaction((tx) => callback(tx));
  }

  return callback(database);
}

function isTransaction(
  database: OfferMutationDatabase
): database is Parameters<Parameters<typeof db.transaction>[0]>[0] {
  return "rollback" in database && typeof database.rollback === "function";
}

function notFound(message: string) {
  return new OfferError("NOT_FOUND", message);
}

/**
 * Whether this individual has accepted the challenge NDA.
 *
 * Deliberately per-user, unlike the offer response itself, which the team
 * leader gives on everyone's behalf. A leader accepting a place cannot waive
 * their teammates' confidentiality obligations, so each member signs before
 * restricted materials are released to them.
 */
export async function hasAcceptedChallengeNda(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: OfferServiceOptions = {}
): Promise<boolean> {
  const database = options.database ?? db;
  const context = await loadOfferContext(applicationPublicId, actor, {
    database,
    now: options.now ?? new Date(),
  });
  if (!context) throw notFound("Offer was not found.");

  const [row] = await database
    .select({ id: agreements.id })
    .from(agreements)
    .where(
      and(
        eq(agreements.userId, actor.userId),
        eq(agreements.challengeId, context.offer.challenge.id),
        eq(agreements.agreementType, "NDA"),
        isNotNull(agreements.acceptedAt),
        isNull(agreements.revokedAt)
      )
    );

  return Boolean(row);
}

/**
 * Records this user's NDA acceptance. Only reachable once the team offer is
 * accepted — signing before there is anything to protect would be theatre.
 */
export async function acceptChallengeNda(
  applicationPublicId: string,
  signature: string,
  actor: ApplicationActorContext,
  options: OfferServiceOptions = {}
): Promise<void> {
  if (signature.trim().length < 3) {
    throw new OfferError("VALIDATION_ERROR", "A signature must be your full name.");
  }

  const database = options.database ?? db;
  const now = options.now ?? new Date();

  const context = await loadOfferContext(applicationPublicId, actor, {
    database,
    now,
  });
  if (!context) throw notFound("Offer was not found.");

  if (context.offer.status !== "ACCEPTED") {
    throw new OfferError(
      "CONFLICT",
      "The team offer must be accepted before the agreement can be signed."
    );
  }

  if (await hasAcceptedChallengeNda(applicationPublicId, actor, options)) return;

  await database.insert(agreements).values({
    acceptedAt: now,
    agreementType: "NDA",
    agreementVersion: "v1",
    applicationId: context.offer.application.id,
    challengeId: context.offer.challenge.id,
    userId: actor.userId,
  });
}
