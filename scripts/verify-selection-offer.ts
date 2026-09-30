import "dotenv/config";

import { and, count, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challenges,
  offers,
  organizations,
  projects,
  selections,
  supervisionRequests,
} from "@/db/schema";
import {
  createApplication,
  toApplicationActorContext,
} from "@/services/application.service";
import { respondToSupervisionRequest } from "@/services/supervision.service";
import {
  OfferError,
  getOfferDetail,
  issueSelectionOffer,
  respondToOffer,
  type SelectionOfferInput,
} from "@/services/offer.service";
import { insertSelectionAndOffer } from "@/db/mutations/offers";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";
import { getAuthenticatedActorForVerification } from "./_actor";

const PREFIX = "qa-666-";

async function main() {
  await cleanup();
  const baseline = await counts();

  const [owner, ownerAdmin2, unrelatedPartner, bao, jordan, priya, hoang, faculty, caid, elab] =
    await Promise.all([
      getAuthenticatedActorForVerification("contact.bencang.demo@example.test"),
      getAuthenticatedActorForVerification("contact.bencang.demo@example.test"),
      getAuthenticatedActorForVerification("contact.vhf.demo@example.test"),
      getAuthenticatedActorForVerification("student.bao-tran.demo@example.test"),
      getAuthenticatedActorForVerification("student.jordan-lee.demo@example.test"),
      getAuthenticatedActorForVerification("student.priya-raman.demo@example.test"),
      getAuthenticatedActorForVerification("student.hoang-tran.demo@example.test"),
      getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test"),
      getAuthenticatedActorForVerification("caid.admin.dev@example.test"),
      getAuthenticatedActorForVerification("elab.admin.dev@example.test"),
    ]);

  const actors = {
    bao: toApplicationActorContext(bao),
    hoang: toApplicationActorContext(hoang),
    jordan: toApplicationActorContext(jordan),
    priya: toApplicationActorContext(priya),
  };

  const ownerOrganizationId = owner.memberships.find(
    (membership) => membership.organizationType === "EXTERNAL_PARTNER"
  )?.organizationId;
  if (!ownerOrganizationId) throw new Error("Owner partner organization missing.");
  const unrelatedOrganizationId = unrelatedPartner.memberships.find(
    (membership) => membership.organizationType === "EXTERNAL_PARTNER"
  )?.organizationId;
  if (!unrelatedOrganizationId) throw new Error("Unrelated partner organization missing.");
  if (unrelatedOrganizationId === ownerOrganizationId) {
    throw new Error("Fixture assumption broken: owner and unrelated partner share an org.");
  }

  const [managing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, "CAID"))
    .limit(1);
  if (!managing) throw new Error("Managing organization missing.");

  const now = new Date();

  try {
    await verifyAuthorization(
      ownerOrganizationId,
      managing.id,
      owner,
      unrelatedPartner,
      caid,
      elab,
      hoang,
      faculty,
      actors,
      now
    );
    await verifyReadinessGates(ownerOrganizationId, managing.id, owner, actors, now);
    const successApplication = await verifySuccessAndTermSnapshot(
      ownerOrganizationId,
      managing.id,
      owner,
      faculty,
      actors,
      now
    );
    await verifyIdempotencyAndConcurrency(
      ownerOrganizationId,
      managing.id,
      owner,
      ownerAdmin2,
      faculty,
      actors,
      now
    );
    await verifyInjectedFailureRollback(ownerOrganizationId, managing.id, owner, faculty, actors, now);
    await verifyTeamRegression(ownerOrganizationId, managing.id, owner, faculty, actors, now);
    await verifyNoDownstreamProvisioning(successApplication.applicationId);
  } finally {
    await cleanup();
  }

  const after = await counts();
  assertEquals(after, baseline, "canonical seed counts must return to baseline");
  console.log("Phase 6.6.6 selection/offer verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

// ---------------------------------------------------------------------------
// A. Selection authorization
// ---------------------------------------------------------------------------

async function verifyAuthorization(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  unrelatedPartner: AuthenticatedActor,
  caid: AuthenticatedActor,
  elab: AuthenticatedActor,
  ordinaryStudent: AuthenticatedActor,
  faculty: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  const challenge = await createChallenge(
    "auth",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const applicationPublicId = await driveToSelectionPending(
    challenge.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );

  const input = offerInput();

  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, unrelatedPartner, { now }),
    "unrelated partner select"
  );
  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, ordinaryStudent, { now }),
    "ordinary student select"
  );
  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, faculty, { now }),
    "faculty select"
  );
  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, caid, { now }),
    "CAID admin select (owner-scoped authority required, not generic admin capability)"
  );
  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, elab, { now }),
    "E-Lab admin select"
  );

  // A membership that is no longer active never reaches `actor.memberships`
  // (see `resolveAuthenticatedActor`'s ACTIVE-only query) — simulate that by
  // handing the same owner user in with an empty membership list, rather
  // than writing/reverting a real row, which would leave a window where a
  // concurrent reader could observe the demoted state.
  const staleOwner: AuthenticatedActor = { ...owner, memberships: [] };
  await expectOfferError(
    "FORBIDDEN",
    () => issueSelectionOffer(applicationPublicId, input, staleOwner, { now }),
    "stale/inactive owner membership select"
  );

  assertCount(await selectionCountFor(applicationPublicId), 0, "no selection before authorized select");

  const issued = await issueSelectionOffer(applicationPublicId, input, owner, { now });
  assert(!issued.alreadyIssued, "authorized owner select should create a new offer");
  assertCount(await selectionCountFor(applicationPublicId), 1, "authorized select must create exactly one selection");
}

// ---------------------------------------------------------------------------
// B. Application readiness
// ---------------------------------------------------------------------------

async function verifyReadinessGates(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  const challenge = await createChallenge(
    "ready",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );

  const submitted = await rawApplication(challenge.id, "SUBMITTED", actors.bao.userId, "b-submitted");
  const assessment = await rawApplication(challenge.id, "ASSESSMENT", actors.bao.userId, "b-assessment");
  const rejected = await rawApplication(challenge.id, "REJECTED", actors.bao.userId, "b-rejected");
  const withdrawn = await rawApplication(challenge.id, "WITHDRAWN", actors.bao.userId, "b-withdrawn");

  for (const [label, publicId] of [
    ["SUBMITTED", submitted],
    ["ASSESSMENT (submitted/unreviewed)", assessment],
    ["REJECTED", rejected],
    ["WITHDRAWN", withdrawn],
  ] as const) {
    await expectOfferError(
      "INVALID_TRANSITION",
      () => issueSelectionOffer(publicId, offerInput(), owner, { now }),
      `select from ${label}`
    );
    assertCount(await selectionCountFor(publicId), 0, `${label} must not create a selection on rejection`);
  }
}

// ---------------------------------------------------------------------------
// C. Offer validation + D.1 normal selection + term snapshot integrity
// ---------------------------------------------------------------------------

async function verifySuccessAndTermSnapshot(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  faculty: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  const challenge = await createChallenge(
    "terms",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const applicationPublicId = await driveToSelectionPending(
    challenge.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );

  await expectOfferError(
    "VALIDATION_ERROR",
    () =>
      issueSelectionOffer(
        applicationPublicId,
        { ...offerInput(), respondByWorkingDays: 0 },
        owner,
        { now }
      ),
    "non-positive respond-by window"
  );
  await expectOfferError(
    "VALIDATION_ERROR",
    () => issueSelectionOffer(applicationPublicId, { ...offerInput(), hoursPerWeek: -3 }, owner, { now }),
    "negative hours per week"
  );
  await expectOfferError(
    "VALIDATION_ERROR",
    () => issueSelectionOffer(applicationPublicId, { ...offerInput(), durationWeeks: 0 }, owner, { now }),
    "zero duration weeks"
  );
  await expectOfferError(
    "VALIDATION_ERROR",
    () => issueSelectionOffer(applicationPublicId, { ...offerInput(), startDate: "not-a-date" }, owner, { now }),
    "malformed start date"
  );
  assertCount(await selectionCountFor(applicationPublicId), 0, "invalid term attempts must not create a selection");

  const issued = await issueSelectionOffer(
    applicationPublicId,
    {
      compensationNote: "Stipend snapshot for verification.",
      durationWeeks: 9,
      hoursPerWeek: 11,
      ndaRequired: true,
      respondByWorkingDays: 4,
      startDate: "2026-10-05",
    },
    owner,
    { now }
  );
  assert(!issued.alreadyIssued, "first issuance must not be idempotent");
  assert(issued.respondBy !== null && issued.respondBy > now, "respond_by must be a future deadline");

  const [row] = await db
    .select({
      compensationNote: offers.compensationNote,
      durationWeeks: offers.durationWeeks,
      hoursPerWeek: offers.hoursPerWeek,
      ndaRequired: offers.ndaRequired,
      respondedAt: offers.respondedAt,
      respondedBy: offers.respondedBy,
      selectedBy: selections.selectedBy,
      status: offers.status,
    })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .where(eq(offers.id, issued.offerId))
    .limit(1);
  if (!row) throw new Error("Issued offer row missing.");
  assert(row.status === "PENDING", "new offer must start PENDING");
  assert(row.respondedAt === null && row.respondedBy === null, "new offer must have no responder yet");
  assert(row.durationWeeks === 9 && row.hoursPerWeek === 11, "offer terms must be the exact snapshot submitted");
  assert(row.ndaRequired === true, "ndaRequired must persist as submitted");
  assert(
    row.selectedBy === owner.user.userId,
    "selected_by must be the server-derived acting partner user, never a client-supplied id"
  );

  const [applicationRow] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.publicId, applicationPublicId))
    .limit(1);
  assert(applicationRow?.status === "SELECTED", "application must transition SELECTION_PENDING -> SELECTED");

  return { applicationId: (await applicationRowId(applicationPublicId))!, applicationPublicId };
}

// ---------------------------------------------------------------------------
// D. Idempotency / concurrency
// ---------------------------------------------------------------------------

async function verifyIdempotencyAndConcurrency(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  ownerAdmin2: AuthenticatedActor,
  faculty: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  // Rapid double-click: two concurrent calls from the same actor with
  // identical terms. This is a replay-equivalent retry, so both must
  // resolve successfully and converge on the one durable offer.
  const doubleClick = await createChallenge(
    "double",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const doubleClickApp = await driveToSelectionPending(
    doubleClick.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );
  const doubleResults = await Promise.allSettled([
    issueSelectionOffer(doubleClickApp, { ...offerInput(), hoursPerWeek: 12 }, owner, { now }),
    issueSelectionOffer(doubleClickApp, { ...offerInput(), hoursPerWeek: 12 }, owner, { now }),
  ]);
  assertOneFreshOneIdempotent(doubleResults, "rapid double-click, identical terms");
  assertCount(await selectionCountFor(doubleClickApp), 1, "double-click must converge to one selection");
  assertCount(await offerCountFor(doubleClickApp), 1, "double-click must converge to one offer");

  // Two tabs submitting materially different terms concurrently: exactly one
  // wins and creates the durable offer; the other is a conflicting retry and
  // must fail loudly rather than silently reporting the winner's terms as
  // its own success.
  const twoTabs = await createChallenge(
    "tabs",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const twoTabsApp = await driveToSelectionPending(
    twoTabs.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );
  const tabResults = await Promise.allSettled([
    issueSelectionOffer(twoTabsApp, { ...offerInput(), hoursPerWeek: 6 }, owner, { now }),
    issueSelectionOffer(twoTabsApp, { ...offerInput(), hoursPerWeek: 18 }, owner, { now }),
  ]);
  assertOneFreshOneConflict(tabResults, "two-tab concurrent select, different hoursPerWeek");
  assertCount(await selectionCountFor(twoTabsApp), 1, "two tabs must converge to one selection");
  assertCount(await offerCountFor(twoTabsApp), 1, "two tabs must converge to one offer");
  const [tabsOffer] = await db
    .select({ hoursPerWeek: offers.hoursPerWeek })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .innerJoin(applications, eq(applications.id, selections.applicationId))
    .where(eq(applications.publicId, twoTabsApp))
    .limit(1);
  assert(
    tabsOffer?.hoursPerWeek === 6 || tabsOffer?.hoursPerWeek === 18,
    "the persisted offer must be exactly one of the two submitted term sets"
  );

  // Two different authorized actors in the same owner organization,
  // concurrently, with identical terms: still a replay-equivalent retry.
  const twoActors = await createChallenge(
    "duo",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const twoActorsApp = await driveToSelectionPending(
    twoActors.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );
  const duoResults = await Promise.allSettled([
    issueSelectionOffer(twoActorsApp, offerInput(), owner, { now }),
    issueSelectionOffer(twoActorsApp, offerInput(), ownerAdmin2, { now }),
  ]);
  assertOneFreshOneIdempotent(duoResults, "two concurrent partner-org actors, identical terms");
  assertCount(await selectionCountFor(twoActorsApp), 1, "two concurrent actors must converge to one selection");

  // Sequential retry after success, identical terms: replay-equivalent,
  // reads back the same durable offer with no new rows.
  const identicalRetry = await issueSelectionOffer(twoActorsApp, offerInput(), owner, { now });
  assert(identicalRetry.alreadyIssued, "identical sequential retry must be idempotent");
  assertCount(await selectionCountFor(twoActorsApp), 1, "identical retry must not create a second selection");
  assertCount(await offerCountFor(twoActorsApp), 1, "identical retry must not create a second offer");

  const beforeConflict = await currentOfferSnapshot(twoActorsApp);

  // Sequential retry after success, changed persisted terms (hoursPerWeek):
  // a controlled conflict, and the existing offer must be untouched.
  await expectOfferError(
    "CONFLICT",
    () => issueSelectionOffer(twoActorsApp, { ...offerInput(), hoursPerWeek: 999 }, owner, { now }),
    "retry with changed hoursPerWeek"
  );
  assertEquals(await currentOfferSnapshot(twoActorsApp), beforeConflict, "existing offer must be unchanged after a conflicting hoursPerWeek retry");

  // Sequential retry after success, changed startDate: also a controlled conflict.
  await expectOfferError(
    "CONFLICT",
    () => issueSelectionOffer(twoActorsApp, { ...offerInput(), startDate: "2026-11-01" }, owner, { now }),
    "retry with changed startDate"
  );
  assertEquals(await currentOfferSnapshot(twoActorsApp), beforeConflict, "existing offer must be unchanged after a conflicting startDate retry");

  // Sequential retry after success, changed respond_by input (working-day
  // count): the computed respond_by differs, which is itself the signal of
  // a materially different retry — also a controlled conflict.
  await expectOfferError(
    "CONFLICT",
    () => issueSelectionOffer(twoActorsApp, { ...offerInput(), respondByWorkingDays: 12 }, owner, { now }),
    "retry with changed respondByWorkingDays"
  );
  assertEquals(await currentOfferSnapshot(twoActorsApp), beforeConflict, "existing offer must be unchanged after a conflicting respond-by retry");

  assertCount(await selectionCountFor(twoActorsApp), 1, "conflicting retries must still leave exactly one selection");
  assertCount(await offerCountFor(twoActorsApp), 1, "conflicting retries must still leave exactly one offer");
}

async function currentOfferSnapshot(applicationPublicId: string) {
  const [row] = await db
    .select({
      compensationNote: offers.compensationNote,
      durationWeeks: offers.durationWeeks,
      hoursPerWeek: offers.hoursPerWeek,
      ndaRequired: offers.ndaRequired,
      respondBy: offers.respondBy,
      startDate: offers.startDate,
    })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .innerJoin(applications, eq(applications.id, selections.applicationId))
    .where(eq(applications.publicId, applicationPublicId))
    .limit(1);
  if (!row) throw new Error("Offer row missing for snapshot.");
  return row;
}

function assertOneFreshOneIdempotent(
  results: PromiseSettledResult<Awaited<ReturnType<typeof issueSelectionOffer>>>[],
  label: string
) {
  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof issueSelectionOffer>>> =>
      result.status === "fulfilled"
  );
  assert(fulfilled.length === 2, `${label}: both concurrent attempts should resolve without throwing`);
  const fresh = fulfilled.filter((result) => !result.value.alreadyIssued);
  const idempotent = fulfilled.filter((result) => result.value.alreadyIssued);
  assert(fresh.length === 1, `${label}: exactly one attempt should create the durable selection/offer`);
  assert(idempotent.length === 1, `${label}: the other attempt should read back the same durable result`);
  assert(
    fresh[0].value.offerId === idempotent[0].value.offerId,
    `${label}: both attempts must agree on the one durable offer id`
  );
}

/**
 * For concurrent conflicting terms, exactly one attempt creates the durable
 * offer and the other must fail as a controlled `CONFLICT` — it must never
 * silently succeed by reporting someone else's terms as its own.
 */
function assertOneFreshOneConflict(
  results: PromiseSettledResult<Awaited<ReturnType<typeof issueSelectionOffer>>>[],
  label: string
) {
  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof issueSelectionOffer>>> =>
      result.status === "fulfilled"
  );
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  assert(fulfilled.length === 1, `${label}: exactly one concurrent conflicting attempt should succeed`);
  assert(!fulfilled[0].value.alreadyIssued, `${label}: the one success must be the fresh creation`);
  assert(rejected.length === 1, `${label}: the other conflicting attempt should be rejected`);
  const reason = rejected[0].reason;
  assert(
    reason instanceof OfferError && reason.code === "CONFLICT",
    `${label}: the losing attempt must fail with a controlled CONFLICT, not silently succeed`
  );
}

// ---------------------------------------------------------------------------
// D.6 / D.7 Injected mid-transaction failures -> full rollback
// ---------------------------------------------------------------------------

async function verifyInjectedFailureRollback(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  faculty: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  // After selection insert, before offer insert: force the offer insert to
  // violate `offers_duration_weeks_positive`, a real DB constraint, and
  // confirm the whole transaction — including the selection row that
  // committed fine on its own — unwinds together.
  const afterSelection = await createChallenge(
    "rb-selection",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const afterSelectionApp = await driveToSelectionPending(
    afterSelection.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );
  const afterSelectionId = (await applicationRowId(afterSelectionApp))!;
  try {
    await db.transaction(async (tx) => {
      await insertSelectionAndOffer(tx, {
        applicationId: afterSelectionId,
        compensationNote: null,
        durationWeeks: -5, // violates offers_duration_weeks_positive
        hoursPerWeek: null,
        ndaRequired: false,
        respondBy: new Date(now.getTime() + 86_400_000),
        selectedAt: now,
        selectedBy: owner.user.userId,
        startDate: null,
      });
    });
    throw new Error("Expected the offer insert to violate its CHECK constraint.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Expected the offer insert")) throw error;
    // A real Postgres constraint violation — the expected outcome.
  }
  assertCount(await selectionCountFor(afterSelectionApp), 0, "a failed offer insert must roll back its selection too");
  assertCount(await offerCountFor(afterSelectionApp), 0, "a failed offer insert must leave no offer row");

  // After offer insert, before the application status transition: force the
  // compare-and-set to miss (wrong expected status), then throw as the real
  // service does on a null result, and confirm full rollback.
  const afterOffer = await createChallenge(
    "rb-offer",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId
  );
  const afterOfferApp = await driveToSelectionPending(
    afterOffer.slug,
    actors.bao,
    faculty,
    faculty.user.userId,
    now
  );
  const afterOfferId = (await applicationRowId(afterOfferApp))!;
  try {
    await db.transaction(async (tx) => {
      const created = await insertSelectionAndOffer(tx, {
        applicationId: afterOfferId,
        compensationNote: null,
        durationWeeks: 6,
        hoursPerWeek: 10,
        ndaRequired: false,
        respondBy: new Date(now.getTime() + 86_400_000),
        selectedAt: now,
        selectedBy: owner.user.userId,
        startDate: null,
      });
      if (!created) throw new Error("Selection/offer insert unexpectedly conflicted.");
      const updated = await tx
        .update(applications)
        .set({ status: "SELECTED", updatedAt: now })
        .where(and(eq(applications.id, afterOfferId), eq(applications.status, "ASSESSMENT")))
        .returning({ id: applications.id });
      if (updated.length === 0) {
        throw new Error("simulated post-offer status-transition failure");
      }
    });
    throw new Error("Expected the compare-and-set status update to miss and throw.");
  } catch (error) {
    if (error instanceof Error && error.message === "simulated post-offer status-transition failure") {
      // Expected.
    } else if (error instanceof Error && error.message.startsWith("Expected the compare-and-set")) {
      throw error;
    }
  }
  assertCount(await selectionCountFor(afterOfferApp), 0, "a failed post-offer status transition must roll back the offer's own selection too");
  assertCount(await offerCountFor(afterOfferApp), 0, "a failed post-offer status transition must leave no offer row");
  const [afterOfferRow] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.id, afterOfferId))
    .limit(1);
  assert(afterOfferRow?.status === "SELECTION_PENDING", "application status must be unchanged after rollback");
}

// ---------------------------------------------------------------------------
// E. Team regression
// ---------------------------------------------------------------------------

async function verifyTeamRegression(
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  owner: AuthenticatedActor,
  faculty: AuthenticatedActor,
  actors: TeamActors,
  now: Date
) {
  const challenge = await createChallenge(
    "team",
    ownerOrganizationId,
    managingOrganizationId,
    owner.user.userId,
    { teamSizeMax: 3, teamSizeMin: 2 }
  );
  // The 6.6.4 lifecycle machinery holds an application at SUBMITTED while any
  // member is still INVITED (see `progressApplicationAfterGateChange`), so a
  // team that must actually reach SELECTION_PENDING has to clear its roster
  // first — an outstanding invitation is itself a `progressed: false` gate,
  // not something this checkpoint bypasses.
  const created = await createApplication(
    {
      challengeSlug: challenge.slug,
      facultySupervisorId: faculty.user.userId,
      leaderCommittedHoursPerWeek: 10,
      members: [{ status: "ACCEPTED", studentEmail: actors.priya.email }],
      motivation: "Disposable Phase 6.6.6 team verification.",
      teamName: "QA 666 Team",
    },
    actors.jordan,
    { now }
  );
  const requestId = await requestIdFor(created.publicId);
  await respondToSupervisionRequest(requestId, "ACCEPT", faculty, { now: plusMinutes(now, 1) });

  const [statusRow] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.publicId, created.publicId))
    .limit(1);
  assert(
    statusRow?.status === "SELECTION_PENDING",
    "team application with a fully-accepted roster must reach SELECTION_PENDING"
  );

  const issued = await issueSelectionOffer(created.publicId, offerInput(), owner, {
    now: plusMinutes(now, 2),
  });
  assert(!issued.alreadyIssued, "team selection should create a fresh offer");

  const [selectionRow] = await db
    .select({ applicationId: selections.applicationId })
    .from(selections)
    .where(eq(selections.id, issued.selectionId))
    .limit(1);
  const [applicationRow] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.publicId, created.publicId))
    .limit(1);
  assert(
    selectionRow?.applicationId === applicationRow?.id,
    "selection must reference the team application, not an individual student"
  );

  const leaderDetail = await getOfferDetail(created.publicId, actors.jordan, { now: plusMinutes(now, 2) });
  assert(leaderDetail?.canRespond === true, "accepted leader must be authorized to respond");

  await expectOfferError(
    "FORBIDDEN",
    () => respondToOffer(created.publicId, "ACCEPT", actors.priya, { now: plusMinutes(now, 2) }),
    "accepted non-leader team member response"
  );

  // An INVITED row can never reach this offer through the real product path
  // (it would have kept the application at SUBMITTED), so this row is
  // inserted directly, purely to prove the authorization boundary itself —
  // `respondToOffer`'s member-status check — rejects a non-accepted member
  // even if one existed. Mirrors the same technique in
  // `verify-offer-runtime.ts`'s `createDisposableOffer` fixture.
  await db.insert(applicationMembers).values({
    applicationId: applicationRow!.id,
    memberRole: "MEMBER",
    status: "INVITED",
    studentId: actors.hoang.userId,
  });
  await expectOfferError(
    "FORBIDDEN",
    () => respondToOffer(created.publicId, "ACCEPT", actors.hoang, { now: plusMinutes(now, 2) }),
    "invited (non-accepted) team member response"
  );

  assertCount(await projectCountFor(applicationRow!.id), 0, "selection/offer issuance must not create a project");
}

async function verifyNoDownstreamProvisioning(applicationId: bigint) {
  assertCount(await projectCountFor(applicationId), 0, "no project may exist from selection/offer issuance alone");
}

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

interface TeamActors {
  bao: ReturnType<typeof toApplicationActorContext>;
  hoang: ReturnType<typeof toApplicationActorContext>;
  jordan: ReturnType<typeof toApplicationActorContext>;
  priya: ReturnType<typeof toApplicationActorContext>;
}

function offerInput(): SelectionOfferInput {
  return {
    compensationNote: "Disposable Phase 6.6.6 verification offer.",
    durationWeeks: 8,
    hoursPerWeek: 10,
    ndaRequired: false,
    respondByWorkingDays: 5,
    startDate: "2026-10-01",
  };
}

async function createChallenge(
  suffix: string,
  ownerOrganizationId: bigint,
  managingOrganizationId: bigint,
  contactPersonId: bigint,
  overrides: { teamSizeMax?: number; teamSizeMin?: number } = {}
) {
  const [challenge] = await db
    .insert(challenges)
    .values({
      applicationDeadline: new Date(Date.now() + 7 * 86_400_000),
      contactPersonId,
      description: "Disposable Phase 6.6.6 selection/offer verification challenge.",
      managingOrganizationId,
      ownerOrganizationId,
      slug: `${PREFIX}${suffix}`,
      status: "APPLICATIONS_OPEN",
      summary: "Disposable selection/offer verification.",
      teamSizeMax: overrides.teamSizeMax ?? 1,
      teamSizeMin: overrides.teamSizeMin ?? 1,
      title: `QA 666 ${suffix}`,
      visibility: "VINUNI_ONLY",
      weeklyHours: 10,
    })
    .returning({ id: challenges.id, slug: challenges.slug });
  if (!challenge || !challenge.slug) throw new Error("Disposable challenge creation failed.");
  return { id: challenge.id, slug: challenge.slug };
}

/** Solo application, accepted supervision, no assessment -> SELECTION_PENDING. */
async function driveToSelectionPending(
  slug: string,
  leaderActor: ReturnType<typeof toApplicationActorContext>,
  faculty: AuthenticatedActor,
  facultySupervisorId: bigint,
  now: Date
) {
  const created = await createApplication(
    {
      challengeSlug: slug,
      facultySupervisorId,
      leaderCommittedHoursPerWeek: 10,
      motivation: "Disposable Phase 6.6.6 selection readiness fixture.",
      teamName: null,
    },
    leaderActor,
    { now }
  );
  const requestId = await requestIdFor(created.publicId);
  await respondToSupervisionRequest(requestId, "ACCEPT", faculty, { now: plusMinutes(now, 1) });

  const [row] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.publicId, created.publicId))
    .limit(1);
  if (row?.status !== "SELECTION_PENDING") {
    throw new Error(
      `Fixture setup did not reach SELECTION_PENDING (got ${row?.status}); the upstream 6.6.4 lifecycle machinery is not behaving as the 6.6.6 verifier assumes.`
    );
  }
  return created.publicId;
}

/** Directly seeds an application in an arbitrary status for a negative readiness test. */
async function rawApplication(
  challengeId: bigint,
  status: "ASSESSMENT" | "REJECTED" | "SUBMITTED" | "WITHDRAWN",
  leaderStudentId: bigint,
  suffix: string
) {
  const publicId = deterministicPublicId(suffix);
  const [application] = await db
    .insert(applications)
    .values({
      challengeId,
      motivation: "Disposable Phase 6.6.6 readiness fixture.",
      publicId,
      status,
      submittedAt: new Date(),
      submittedBy: leaderStudentId,
      teamName: null,
    })
    .returning({ id: applications.id });
  if (!application) throw new Error("Disposable application creation failed.");
  await db.insert(applicationMembers).values({
    applicationId: application.id,
    memberRole: "LEADER",
    respondedAt: new Date(),
    status: "ACCEPTED",
    studentId: leaderStudentId,
  });
  return publicId;
}

function deterministicPublicId(suffix: string) {
  const hash = Buffer.from(suffix).toString("hex").padEnd(12, "0").slice(0, 12);
  return `66666666-6666-6666-8666-${hash}`;
}

async function requestIdFor(publicId: string) {
  const [request] = await db
    .select({ id: supervisionRequests.id })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .where(eq(applications.publicId, publicId))
    .limit(1);
  if (!request) throw new Error("Supervision request missing.");
  return request.id;
}

async function applicationRowId(publicId: string) {
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.publicId, publicId))
    .limit(1);
  return row?.id ?? null;
}

async function selectionCountFor(applicationPublicId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(selections)
    .innerJoin(applications, eq(applications.id, selections.applicationId))
    .where(eq(applications.publicId, applicationPublicId));
  return Number(row?.total ?? 0);
}

async function offerCountFor(applicationPublicId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(offers)
    .innerJoin(selections, eq(selections.id, offers.selectionId))
    .innerJoin(applications, eq(applications.id, selections.applicationId))
    .where(eq(applications.publicId, applicationPublicId));
  return Number(row?.total ?? 0);
}

async function projectCountFor(applicationId: bigint) {
  const [row] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.applicationId, applicationId));
  return Number(row?.total ?? 0);
}

async function counts() {
  const [applicationRows, memberRows, selectionRows, offerRows, challengeRows, projectRows] =
    await Promise.all([
      db.select({ total: count() }).from(applications),
      db.select({ total: count() }).from(applicationMembers),
      db.select({ total: count() }).from(selections),
      db.select({ total: count() }).from(offers),
      db.select({ total: count() }).from(challenges),
      db.select({ total: count() }).from(projects),
    ]);
  return {
    applicationMembers: Number(memberRows[0]?.total ?? 0),
    applications: Number(applicationRows[0]?.total ?? 0),
    challenges: Number(challengeRows[0]?.total ?? 0),
    offers: Number(offerRows[0]?.total ?? 0),
    projects: Number(projectRows[0]?.total ?? 0),
    selections: Number(selectionRows[0]?.total ?? 0),
  };
}

async function cleanup() {
  const slugs = [
    "auth",
    "ready",
    "terms",
    "double",
    "tabs",
    "duo",
    "rb-selection",
    "rb-offer",
    "team",
  ].map((suffix) => `${PREFIX}${suffix}`);

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: challenges.id })
      .from(challenges)
      .where(inArray(challenges.slug, slugs));
    const challengeIds = rows.map((row) => row.id);
    if (challengeIds.length === 0) return;

    const applicationRows = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(inArray(applications.challengeId, challengeIds));
    const applicationIds = applicationRows.map((row) => row.id);

    if (applicationIds.length > 0) {
      const selectionRows = await tx
        .select({ id: selections.id })
        .from(selections)
        .where(inArray(selections.applicationId, applicationIds));
      const selectionIds = selectionRows.map((row) => row.id);
      if (selectionIds.length > 0) {
        await tx.delete(offers).where(inArray(offers.selectionId, selectionIds));
        await tx.delete(selections).where(inArray(selections.id, selectionIds));
      }
      await tx.delete(applications).where(inArray(applications.id, applicationIds));
    }
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  });
}

function plusMinutes(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60_000);
}

async function expectOfferError(code: OfferError["code"], action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof OfferError && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertCount(actual: number, expected: number, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}.`);
}

function assertEquals(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}: expected ${b}, received ${a}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
