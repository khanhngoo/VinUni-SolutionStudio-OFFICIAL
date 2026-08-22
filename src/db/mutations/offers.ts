import { and, eq, gte, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { offers } from "@/db/schema";
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
