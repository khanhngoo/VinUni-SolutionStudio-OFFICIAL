import { and, eq, gte, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { offers, selections } from "@/db/schema";
import type { OfferRuntimeStatus } from "@/db/queries/offers";

export type OfferMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface OfferResponseMutationRead {
  id: bigint;
  respondedAt: Date | null;
  respondedBy: bigint | null;
  status: OfferRuntimeStatus;
}

export async function respondToPendingOffer(
  database: OfferMutationDatabase,
  input: {
    now: Date;
    offerId: bigint;
    respondedBy: bigint;
    status: Extract<OfferRuntimeStatus, "ACCEPTED" | "DECLINED">;
  }
): Promise<OfferResponseMutationRead | null> {
  const [offer] = await database
    .update(offers)
    .set({
      respondedAt: input.now,
      respondedBy: input.respondedBy,
      status: input.status,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(offers.id, input.offerId),
        eq(offers.status, "PENDING"),
        or(isNull(offers.respondBy), gte(offers.respondBy, input.now))
      )
    )
    .returning({
      id: offers.id,
      respondedAt: offers.respondedAt,
      respondedBy: offers.respondedBy,
      status: sql<OfferRuntimeStatus>`coalesce(${offers.status}, 'PENDING')`,
    });

  return offer ?? null;
}

export interface SelectionOfferInsertValues {
  applicationId: bigint;
  compensationNote: string | null;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  ndaRequired: boolean;
  respondBy: Date;
  selectedAt: Date;
  selectedBy: bigint;
  startDate: string | null;
}

export interface SelectionOfferInsertResult {
  offerId: bigint;
  respondBy: Date | null;
  selectionId: bigint;
  status: OfferRuntimeStatus;
}

/**
 * Creates a selection and its initial PENDING offer as one durable pair.
 * `selections.application_id` is unique, so a concurrent duplicate insert
 * resolves to no row here rather than a thrown constraint error; callers also
 * hold the application's lifecycle row lock while calling this, which is the
 * primary race defense; the unique index is the defense-in-depth backstop.
 */
export async function insertSelectionAndOffer(
  database: OfferMutationDatabase,
  values: SelectionOfferInsertValues
): Promise<SelectionOfferInsertResult | null> {
  const [selection] = await database
    .insert(selections)
    .values({
      applicationId: values.applicationId,
      selectedAt: values.selectedAt,
      selectedBy: values.selectedBy,
    })
    .onConflictDoNothing({ target: selections.applicationId })
    .returning({ id: selections.id });

  if (!selection) return null;

  const [offer] = await database
    .insert(offers)
    .values({
      compensationNote: values.compensationNote,
      durationWeeks: values.durationWeeks,
      hoursPerWeek: values.hoursPerWeek,
      ndaRequired: values.ndaRequired,
      respondBy: values.respondBy,
      selectionId: selection.id,
      startDate: values.startDate,
      status: "PENDING",
    })
    .returning({
      id: offers.id,
      respondBy: offers.respondBy,
      status: sql<OfferRuntimeStatus>`coalesce(${offers.status}, 'PENDING')`,
    });

  if (!offer) {
    throw new Error("Offer could not be created for a new selection.");
  }

  return {
    offerId: offer.id,
    respondBy: offer.respondBy,
    selectionId: selection.id,
    status: offer.status,
  };
}
