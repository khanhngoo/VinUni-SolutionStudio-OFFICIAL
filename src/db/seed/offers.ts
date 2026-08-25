import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import {
  agreements,
  applicationMembers,
  applications,
  offers,
  selections,
} from "../schema";
import type { SeedContext } from "./context";

type OfferStatus = "PENDING" | "ACCEPTED";
type AgreementType = "NDA";

interface AgreementSeed {
  acceptedAt: Date;
  agreementType: AgreementType;
  userKey: string;
}

interface SelectionOfferSeed {
  agreementAcceptedAt?: Date;
  agreementUsers?: string[];
  applicationKey: string;
  applicationStatusUpdatedAt: Date;
  classification:
    | "SELECTION_WITH_PENDING_OFFER"
    | "SELECTION_WITH_ACCEPTED_OFFER";
  compensationNote: string;
  createdAt: Date;
  durationWeeks: number;
  hoursPerWeek: number;
  key: string;
  ndaRequired: boolean;
  respondedAt: Date | null;
  respondedByLeaderUserKey: string | null;
  respondBy: Date;
  selectedAt: Date;
  selectedByUserKey: string;
  source: "DIRECT_FIXTURE" | "SYNTHESIZED_LIFECYCLE_SUPPORT";
  startDate: string;
  status: OfferStatus;
}

function atUtc(iso: string) {
  return new Date(iso);
}

const AGREEMENT_VERSION = "demo-v1";

export const DEMO_SELECTION_OFFERS: SelectionOfferSeed[] = [
  {
    key: "selection-offer:app-route",
    applicationKey: "application:app-route",
    classification: "SELECTION_WITH_PENDING_OFFER",
    source: "DIRECT_FIXTURE",
    selectedByUserKey: "user:contact-org-bencang",
    selectedAt: atUtc("2026-07-26T08:00:00.000Z"),
    createdAt: atUtc("2026-07-26T09:00:00.000Z"),
    respondBy: atUtc("2026-07-28T16:00:00.000Z"),
    hoursPerWeek: 10,
    durationWeeks: 10,
    compensationNote: "Paid - stipend confirmed by the partner",
    ndaRequired: true,
    startDate: "2026-08-17",
    status: "PENDING",
    respondedByLeaderUserKey: null,
    respondedAt: null,
    applicationStatusUpdatedAt: atUtc("2026-07-26T09:00:00.000Z"),
  },
  {
    key: "selection-offer:app-supply",
    applicationKey: "application:app-supply",
    classification: "SELECTION_WITH_ACCEPTED_OFFER",
    source: "DIRECT_FIXTURE",
    selectedByUserKey: "user:contact-org-bencang",
    selectedAt: atUtc("2026-06-18T08:00:00.000Z"),
    createdAt: atUtc("2026-06-18T09:00:00.000Z"),
    respondBy: atUtc("2026-06-21T12:00:00.000Z"),
    hoursPerWeek: 12,
    durationWeeks: 12,
    compensationNote: "Paid - stipend disbursed off-platform by the partner",
    ndaRequired: true,
    startDate: "2026-06-22",
    status: "ACCEPTED",
    respondedByLeaderUserKey: "user:stu-jordan-lee",
    respondedAt: atUtc("2026-06-20T10:00:00.000Z"),
    agreementAcceptedAt: atUtc("2026-06-20T11:00:00.000Z"),
    agreementUsers: [
      "user:stu-jordan-lee",
      "user:stu-priya-raman",
      "user:stu-minh-anh",
    ],
    applicationStatusUpdatedAt: atUtc("2026-06-20T11:00:00.000Z"),
  },
  {
    key: "selection-offer:app-energy",
    applicationKey: "application:app-energy",
    classification: "SELECTION_WITH_ACCEPTED_OFFER",
    source: "DIRECT_FIXTURE",
    selectedByUserKey: "user:contact-org-facilities",
    selectedAt: atUtc("2026-04-05T08:00:00.000Z"),
    createdAt: atUtc("2026-04-05T09:00:00.000Z"),
    respondBy: atUtc("2026-04-08T12:00:00.000Z"),
    hoursPerWeek: 6,
    durationWeeks: 14,
    compensationNote: "Work-study - logged through the student employment office",
    ndaRequired: false,
    startDate: "2026-04-13",
    status: "ACCEPTED",
    respondedByLeaderUserKey: "user:stu-jordan-lee",
    respondedAt: atUtc("2026-04-07T10:00:00.000Z"),
    applicationStatusUpdatedAt: atUtc("2026-04-07T10:00:00.000Z"),
  },
  {
    key: "selection-offer:app-archive",
    applicationKey: "application:app-archive",
    classification: "SELECTION_WITH_ACCEPTED_OFFER",
    source: "DIRECT_FIXTURE",
    selectedByUserKey: "user:contact-org-heritage",
    selectedAt: atUtc("2025-12-18T08:00:00.000Z"),
    createdAt: atUtc("2025-12-18T09:00:00.000Z"),
    respondBy: atUtc("2025-12-21T12:00:00.000Z"),
    hoursPerWeek: 6,
    durationWeeks: 16,
    compensationNote: "Credit - 2 elective credits recorded",
    ndaRequired: false,
    startDate: "2026-01-12",
    status: "ACCEPTED",
    respondedByLeaderUserKey: "user:stu-jordan-lee",
    respondedAt: atUtc("2025-12-20T10:00:00.000Z"),
    applicationStatusUpdatedAt: atUtc("2025-12-20T10:00:00.000Z"),
  },
  {
    key: "selection-offer:papp-depot",
    applicationKey: "application:papp-depot",
    classification: "SELECTION_WITH_ACCEPTED_OFFER",
    source: "SYNTHESIZED_LIFECYCLE_SUPPORT",
    selectedByUserKey: "user:contact-org-bencang",
    selectedAt: atUtc("2026-06-05T08:00:00.000Z"),
    createdAt: atUtc("2026-06-05T09:00:00.000Z"),
    respondBy: atUtc("2026-06-08T17:00:00.000Z"),
    hoursPerWeek: 10,
    durationWeeks: 10,
    compensationNote: "Paid - 10,000,000 VND stipend",
    ndaRequired: true,
    startDate: "2026-06-12",
    status: "ACCEPTED",
    respondedByLeaderUserKey: "user:stu-bao-tran",
    respondedAt: atUtc("2026-06-07T10:00:00.000Z"),
    agreementAcceptedAt: atUtc("2026-06-07T11:00:00.000Z"),
    agreementUsers: ["user:stu-bao-tran", "user:stu-hoang-tran"],
    applicationStatusUpdatedAt: atUtc("2026-06-07T11:00:00.000Z"),
  },
];

function agreementsFor(seed: SelectionOfferSeed): AgreementSeed[] {
  if (!seed.agreementUsers || !seed.agreementAcceptedAt) return [];

  return seed.agreementUsers.map((userKey) => ({
    acceptedAt: seed.agreementAcceptedAt!,
    agreementType: "NDA",
    userKey,
  }));
}

async function ensureSelection(ctx: SeedContext, seed: SelectionOfferSeed) {
  const applicationId = ctx.getId(seed.applicationKey);
  const selectedBy = ctx.getId(seed.selectedByUserKey);

  const [selection] = await ctx.tx
    .insert(selections)
    .values({
      applicationId,
      createdAt: seed.createdAt,
      selectedAt: seed.selectedAt,
      selectedBy,
    })
    .onConflictDoUpdate({
      target: selections.applicationId,
      set: {
        createdAt: seed.createdAt,
        selectedAt: seed.selectedAt,
        selectedBy,
      },
    })
    .returning({ id: selections.id });

  ctx.setId(`selection:${seed.applicationKey}`, selection.id);
  return selection.id;
}

async function ensureOffer(
  ctx: SeedContext,
  selectionId: bigint,
  seed: SelectionOfferSeed
) {
  const respondedBy = seed.respondedByLeaderUserKey
    ? ctx.getId(seed.respondedByLeaderUserKey)
    : null;

  const [offer] = await ctx.tx
    .insert(offers)
    .values({
      compensationNote: seed.compensationNote,
      createdAt: seed.createdAt,
      durationWeeks: seed.durationWeeks,
      hoursPerWeek: seed.hoursPerWeek,
      ndaRequired: seed.ndaRequired,
      respondedAt: seed.respondedAt,
      respondedBy,
      respondBy: seed.respondBy,
      selectionId,
      startDate: seed.startDate,
      status: seed.status,
      updatedAt: seed.respondedAt ?? seed.createdAt,
    })
    .onConflictDoUpdate({
      target: offers.selectionId,
      set: {
        compensationNote: seed.compensationNote,
        createdAt: seed.createdAt,
        durationWeeks: seed.durationWeeks,
        hoursPerWeek: seed.hoursPerWeek,
        ndaRequired: seed.ndaRequired,
        respondedAt: seed.respondedAt,
        respondedBy,
        respondBy: seed.respondBy,
        startDate: seed.startDate,
        status: seed.status,
        updatedAt: seed.respondedAt ?? seed.createdAt,
      },
    })
    .returning({ id: offers.id });

  ctx.setId(`offer:${seed.applicationKey}`, offer.id);
  return offer.id;
}

async function ensureAgreement(
  ctx: SeedContext,
  seed: SelectionOfferSeed,
  agreement: AgreementSeed
) {
  const applicationId = ctx.getId(seed.applicationKey);
  const challengeId = await findApplicationChallengeId(ctx, applicationId, seed);
  const userId = ctx.getId(agreement.userKey);

  const existing = await ctx.tx
    .select({ id: agreements.id })
    .from(agreements)
    .where(
      and(
        eq(agreements.userId, userId),
        eq(agreements.challengeId, challengeId),
        eq(agreements.applicationId, applicationId),
        eq(agreements.agreementType, agreement.agreementType),
        eq(agreements.agreementVersion, AGREEMENT_VERSION)
      )
    )
    .limit(2);

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed duplicate agreement for ${agreement.userKey} on ${seed.applicationKey}.`
    );
  }

  const values = {
    acceptedAt: agreement.acceptedAt,
    agreementType: agreement.agreementType,
    agreementVersion: AGREEMENT_VERSION,
    applicationId,
    challengeId,
    documentUrl: null,
    revokedAt: null,
    userId,
  };

  if (existing[0]) {
    await ctx.tx
      .update(agreements)
      .set(values)
      .where(eq(agreements.id, existing[0].id));
    return existing[0].id;
  }

  const [created] = await ctx.tx
    .insert(agreements)
    .values(values)
    .returning({ id: agreements.id });

  return created.id;
}

async function findApplicationChallengeId(
  ctx: SeedContext,
  applicationId: bigint,
  seed: SelectionOfferSeed
) {
  const rows = await ctx.tx
    .select({ challengeId: applications.challengeId })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!rows[0]) {
    throw new Error(`Refusing to seed ${seed.key}: application does not exist.`);
  }

  return rows[0].challengeId;
}

async function markApplicationSelected(ctx: SeedContext, seed: SelectionOfferSeed) {
  await ctx.tx
    .update(applications)
    .set({
      status: "SELECTED",
      updatedAt: seed.applicationStatusUpdatedAt,
    })
    .where(eq(applications.id, ctx.getId(seed.applicationKey)));
}

async function validateDemoSelectionsOffers(ctx: SeedContext) {
  const selectedApplicationIds = DEMO_SELECTION_OFFERS.map((seed) =>
    ctx.getId(seed.applicationKey)
  );

  const selectionIds = DEMO_SELECTION_OFFERS.map((seed) =>
    ctx.getId(`selection:${seed.applicationKey}`)
  );

  const duplicateSelections = await ctx.tx.execute(sql`
    select application_id
    from selections
    group by application_id
    having count(*) > 1
  `);

  if (duplicateSelections.rows.length > 0) {
    throw new Error("Seed validation failed: duplicate selections per application.");
  }

  const selectedWithoutSelection = await ctx.tx
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.status, "SELECTED"),
        sql`not exists (
          select 1 from selections s where s.application_id = ${applications.id}
        )`
      )
    );

  if (selectedWithoutSelection.length > 0) {
    throw new Error("Seed validation failed: SELECTED application without selection.");
  }

  const rejectedWithSelection = await ctx.tx
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.status, "REJECTED"),
        sql`exists (
          select 1 from selections s where s.application_id = ${applications.id}
        )`
      )
    );

  if (rejectedWithSelection.length > 0) {
    throw new Error("Seed validation failed: REJECTED application has a selection.");
  }

  const selectedStatusRows = await ctx.tx
    .select({ id: applications.id })
    .from(applications)
    .where(inArray(applications.id, selectedApplicationIds));

  if (selectedStatusRows.length !== selectedApplicationIds.length) {
    throw new Error("Seed validation failed: not all selected applications exist.");
  }

  const duplicateOffers = await ctx.tx.execute(sql`
    select selection_id
    from offers
    group by selection_id
    having count(*) > 1
  `);

  if (duplicateOffers.rows.length > 0) {
    throw new Error("Seed validation failed: duplicate offers per selection.");
  }

  const terminalOfferProblems = await ctx.tx
    .select({ id: offers.id })
    .from(offers)
    .where(
      and(
        inArray(offers.selectionId, selectionIds),
        sql`${offers.status} in ('ACCEPTED', 'DECLINED')`,
        sql`(${offers.respondedAt} is null or ${offers.respondedBy} is null)`
      )
    );

  if (terminalOfferProblems.length > 0) {
    throw new Error(
      "Seed validation failed: accepted/declined offers must have response actor/time."
    );
  }

  const pendingOfferProblems = await ctx.tx
    .select({ id: offers.id })
    .from(offers)
    .where(
      and(
        inArray(offers.selectionId, selectionIds),
        eq(offers.status, "PENDING"),
        sql`(${offers.respondedAt} is not null or ${offers.respondedBy} is not null)`
      )
    );

  if (pendingOfferProblems.length > 0) {
    throw new Error(
      "Seed validation failed: pending offers must not have response actor/time."
    );
  }

  const chronologyProblems = await ctx.tx
    .select({ id: offers.id })
    .from(offers)
    .innerJoin(selections, eq(offers.selectionId, selections.id))
    .where(
      and(
        inArray(offers.selectionId, selectionIds),
        sql`(
          ${selections.selectedAt} > ${offers.createdAt}
          or ${offers.createdAt} > ${offers.respondBy}
          or (${offers.respondedAt} is not null and ${offers.respondedAt} < ${offers.createdAt})
          or (${offers.respondedAt} is not null and ${offers.respondedAt} > ${offers.respondBy})
        )`
      )
    );

  if (chronologyProblems.length > 0) {
    throw new Error("Seed validation failed: incoherent selection/offer timestamps.");
  }

  const invalidResponders = await ctx.tx
    .select({ id: offers.id })
    .from(offers)
    .innerJoin(selections, eq(offers.selectionId, selections.id))
    .leftJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, selections.applicationId),
        eq(applicationMembers.studentId, offers.respondedBy),
        eq(applicationMembers.memberRole, "LEADER"),
        eq(applicationMembers.status, "ACCEPTED")
      )
    )
    .where(
      and(
        inArray(offers.selectionId, selectionIds),
        sql`${offers.status} in ('ACCEPTED', 'DECLINED')`,
        isNull(applicationMembers.id)
      )
    );

  if (invalidResponders.length > 0) {
    throw new Error(
      "Seed validation failed: offer responder must be the accepted application leader."
    );
  }

  const agreementProblems = await ctx.tx
    .select({ id: agreements.id })
    .from(agreements)
    .innerJoin(applications, eq(agreements.applicationId, applications.id))
    .where(
      and(
        inArray(agreements.applicationId, selectedApplicationIds),
        sql`${agreements.challengeId} <> ${applications.challengeId}`
      )
    );

  if (agreementProblems.length > 0) {
    throw new Error(
      "Seed validation failed: agreement application/challenge mismatch."
    );
  }

  const agreementMemberProblems = await ctx.tx
    .select({ id: agreements.id })
    .from(agreements)
    .leftJoin(
      applicationMembers,
      and(
        eq(applicationMembers.applicationId, agreements.applicationId),
        eq(applicationMembers.studentId, agreements.userId),
        eq(applicationMembers.status, "ACCEPTED")
      )
    )
    .where(
      and(
        inArray(agreements.applicationId, selectedApplicationIds),
        isNotNull(agreements.applicationId),
        isNull(applicationMembers.id)
      )
    );

  if (agreementMemberProblems.length > 0) {
    throw new Error(
      "Seed validation failed: agreements must belong to accepted application members."
    );
  }
}

export async function seedDemoSelectionsOffersAgreements(ctx: SeedContext) {
  for (const seed of DEMO_SELECTION_OFFERS) {
    const selectionId = await ensureSelection(ctx, seed);
    await ensureOffer(ctx, selectionId, seed);

    for (const agreement of agreementsFor(seed)) {
      await ensureAgreement(ctx, seed, agreement);
    }

    await markApplicationSelected(ctx, seed);
  }

  await validateDemoSelectionsOffers(ctx);

  const agreementCount = DEMO_SELECTION_OFFERS.reduce(
    (total, seed) => total + agreementsFor(seed).length,
    0
  );

  ctx.record("DEMO", "selections", DEMO_SELECTION_OFFERS.length);
  ctx.record("DEMO", "offers", DEMO_SELECTION_OFFERS.length);
  ctx.record("DEMO", "agreements", agreementCount);
}
