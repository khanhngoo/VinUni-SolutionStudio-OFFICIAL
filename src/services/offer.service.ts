import { db } from "@/db";
import {
  getOfferByApplicationPublicId,
  getOfferMember,
  type OfferRead,
  type OfferRuntimeStatus,
} from "@/db/queries/offers";
import {
  respondToPendingOffer,
  type OfferMutationDatabase,
} from "@/db/mutations/offers";
import {
  getDevelopmentApplicationActor,
  type ApplicationActorContext,
  type DevelopmentApplicationActorKey,
} from "@/services/application.service";

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
    const context = await loadOfferContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!context) throw notFound("Offer was not found.");

    assertLeaderCanRespond(context, now);
    const updated = await respondToPendingOffer(tx, {
      now,
      offerId: context.offer.id,
      respondedBy: actor.userId,
      status: response === "ACCEPT" ? "ACCEPTED" : "DECLINED",
    });
    if (!updated) {
      throw new OfferError(
        "CONFLICT",
        "Offer response could not be recorded because the offer is no longer pending."
      );
    }

    const result = await loadOfferContext(applicationPublicId, actor, {
      database: tx,
      now,
    });
    if (!result) throw new OfferError("CONFLICT", "Responded offer could not be read.");
    return toServiceDetail(result, now);
  });
}

async function loadOfferContext(
  applicationPublicId: string,
  actor: ApplicationActorContext,
  options: OfferServiceOptions
): Promise<OfferContext | null> {
  assertStudentActor(actor);

  const database = options.database ?? db;
  const offer = await getOfferByApplicationPublicId(
    database,
    applicationPublicId.trim()
  );
  if (!offer) return null;

  const member = await getOfferMember(database, offer.application.id, actor.userId);
  if (!member) {
    throw new OfferError("FORBIDDEN", "Actor is not an application member.");
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

function assertLeaderCanRespond(context: OfferContext, now: Date) {
  if (
    context.member.memberRole !== "LEADER" ||
    context.member.status !== "ACCEPTED"
  ) {
    throw new OfferError(
      "FORBIDDEN",
      "Only the accepted application leader can respond to the team offer."
    );
  }
  if (context.offer.status !== "PENDING") {
    throw new OfferError("INVALID_TRANSITION", "Offer has already been resolved.");
  }
  if (isExpired(context.offer, now)) {
    throw new OfferError("INVALID_TRANSITION", "Offer response window has expired.");
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
  if (hasTransaction(database)) {
    return database.transaction((tx) => callback(tx));
  }

  return callback(database);
}

function hasTransaction(
  database: OfferMutationDatabase
): database is typeof db {
  return "transaction" in database && typeof database.transaction === "function";
}

function notFound(message: string) {
  return new OfferError("NOT_FOUND", message);
}
