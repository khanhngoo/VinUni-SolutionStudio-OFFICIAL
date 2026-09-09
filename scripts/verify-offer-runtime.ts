import { count, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challenges,
  offers,
  projects,
  selections,
  users,
} from "@/db/schema";
import {
  OfferError,
  getDevelopmentOfferActor,
  getOfferDetail,
  respondToOffer,
} from "@/services/offer.service";

const APP_ROUTE = "44444444-4444-4444-8444-000000000002";
const APP_SUPPLY = "44444444-4444-4444-8444-000000000005";
const DISPOSABLE_ACCEPT = "55555555-5555-5555-8555-000000000053";
const DISPOSABLE_DECLINE = "55555555-5555-5555-8555-000000000055";
const DISPOSABLE_EXPIRED = "55555555-5555-5555-8555-000000000054";
const ROLLBACK_SENTINEL = Symbol("rollback offer runtime verification");
type RuntimeDatabase = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function main() {
  const before = await snapshot();
  assertCount(before.offers, 5, "offers");
  assertCount(before.selections, 5, "selections");
  assertCount(before.projects, 4, "projects");

  try {
    await db.transaction(async (tx) => {
      const jordan = await getDevelopmentOfferActor("JORDAN_STUDENT_DEMO", { database: tx });
      const priya = await getDevelopmentOfferActor("PRIYA_STUDENT_DEMO", { database: tx });
      const hoang = await getDevelopmentOfferActor("HOANG_STUDENT_DEMO", { database: tx });
      const minh = await actorByEmail(tx, "student.minh-anh.demo@example.test");

      const route = await getOfferDetail(APP_ROUTE, jordan, { database: tx, now: now() });
      assert(route?.offer.status === "PENDING", "app-route must remain the pending offer scenario");
      assert(!route.offer.isExpired, "canonical live app-route offer must stay unexpired against the fixed verification clock");
      assert(route.canRespond, "accepted leader must be able to respond to the live app-route offer");

      const supply = await getOfferDetail(APP_SUPPLY, jordan, { database: tx, now: now() });
      assert(supply?.offer.status === "ACCEPTED", "accepted historical offer should render");
      assert(supply.offer.respondedByName === "Jordan Lee", "historical responder missing");

      await createDisposableOffer(tx, {
        publicId: DISPOSABLE_ACCEPT,
        respondBy: new Date("2026-09-01T12:00:00.000Z"),
        includeInvitedMinh: true,
        jordanId: jordan.userId,
        priyaId: priya.userId,
        minhId: minh.userId,
      });

      await expectOfferError("FORBIDDEN", () => respondToOffer(DISPOSABLE_ACCEPT, "ACCEPT", priya, { database: tx, now: now() }), "accepted non-leader response");
      await expectOfferError("FORBIDDEN", () => respondToOffer(DISPOSABLE_ACCEPT, "ACCEPT", minh, { database: tx, now: now() }), "invited member response");
      await expectOfferError("FORBIDDEN", () => respondToOffer(DISPOSABLE_ACCEPT, "ACCEPT", hoang, { database: tx, now: now() }), "unrelated student response");

      const beforeChallengeChange = await getOfferDetail(DISPOSABLE_ACCEPT, jordan, { database: tx, now: now() });
      await tx.update(challenges).set({ weeklyHours: 99 }).where(eq(challenges.slug, "route-optimisation"));
      const afterChallengeChange = await getOfferDetail(DISPOSABLE_ACCEPT, jordan, { database: tx, now: now() });
      assert(beforeChallengeChange?.offer.terms.hoursPerWeek === 10, "disposable snapshot terms missing");
      assert(afterChallengeChange?.offer.terms.hoursPerWeek === 10, "offer terms must not derive from challenge terms");

      const accepted = await respondToOffer(DISPOSABLE_ACCEPT, "ACCEPT", jordan, { database: tx, now: now() });
      assert(accepted.offer.status === "ACCEPTED", "accepted offer status mismatch");
      assert(accepted.offer.respondedByName === "Jordan Lee", "server did not own responder");
      assert(accepted.offer.respondedAt?.getTime() === now().getTime(), "server did not own response time");
      await expectOfferError("INVALID_TRANSITION", () => respondToOffer(DISPOSABLE_ACCEPT, "DECLINE", jordan, { database: tx, now: now() }), "stale response");

      await createDisposableOffer(tx, {
        publicId: DISPOSABLE_DECLINE,
        respondBy: new Date("2026-09-01T12:00:00.000Z"),
        includeInvitedMinh: false,
        jordanId: jordan.userId,
        priyaId: priya.userId,
        minhId: minh.userId,
      });
      const declined = await respondToOffer(DISPOSABLE_DECLINE, "DECLINE", jordan, { database: tx, now: now() });
      assert(declined.offer.status === "DECLINED", "declined offer status mismatch");
      assert(declined.application.status === "SELECTED", "offer decline must not invent an application status transition");

      await createDisposableOffer(tx, {
        publicId: DISPOSABLE_EXPIRED,
        respondBy: new Date("2026-08-01T12:00:00.000Z"),
        includeInvitedMinh: false,
        jordanId: jordan.userId,
        priyaId: priya.userId,
        minhId: minh.userId,
      });
      await expectOfferError("INVALID_TRANSITION", () => respondToOffer(DISPOSABLE_EXPIRED, "ACCEPT", jordan, { database: tx, now: now() }), "expired offer response");

      const inside = await snapshot(tx);
      assertCount(inside.projects, before.projects, "projects after offer acceptance");
      throw ROLLBACK_SENTINEL;
    });
  } catch (error) {
    if (error !== ROLLBACK_SENTINEL) throw error;
  }

  const after = await snapshot();
  assert(JSON.stringify(after) === JSON.stringify(before), "canonical seed changed after rollback");
  console.log("Phase 5.3 offer runtime verification passed.");
  console.log(JSON.stringify(after, null, 2));
}

async function createDisposableOffer(
  tx: RuntimeDatabase,
  input: { includeInvitedMinh: boolean; jordanId: bigint; minhId: bigint; priyaId: bigint; publicId: string; respondBy: Date }
) {
  const [challenge] = await tx.select({ id: challenges.id }).from(challenges).where(eq(challenges.slug, "route-optimisation")).limit(1);
  if (!challenge) throw new Error("Missing route optimisation challenge.");
  const [application] = await tx.insert(applications).values({ challengeId: challenge.id, motivation: "Disposable Phase 5.3 offer verification.", publicId: input.publicId, status: "SELECTED", submittedAt: now(), submittedBy: input.jordanId, teamName: "Disposable Offer Runtime" }).returning({ id: applications.id });
  await tx.insert(applicationMembers).values([
    { applicationId: application.id, memberRole: "LEADER", respondedAt: now(), status: "ACCEPTED", studentId: input.jordanId },
    { applicationId: application.id, memberRole: "MEMBER", respondedAt: now(), status: "ACCEPTED", studentId: input.priyaId },
    ...(input.includeInvitedMinh ? [{ applicationId: application.id, memberRole: "MEMBER" as const, status: "INVITED" as const, studentId: input.minhId }] : []),
  ]);
  const [selection] = await tx.insert(selections).values({ applicationId: application.id, selectedAt: now(), selectedBy: input.jordanId }).returning({ id: selections.id });
  await tx.insert(offers).values({ compensationNote: "Disposable offer snapshot; issued independently from challenge terms.", durationWeeks: 10, hoursPerWeek: 10, ndaRequired: true, respondBy: input.respondBy, selectionId: selection.id, startDate: "2026-09-07", status: "PENDING" });
}

async function actorByEmail(tx: RuntimeDatabase, email: string) {
  const actor = await getDevelopmentOfferActor("JORDAN_STUDENT_DEMO", { database: tx });
  const [user] = await tx
    .select({ email: users.email, fullName: users.fullName, userId: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) throw new Error(`Missing development actor ${email}.`);
  return { ...actor, ...user };
}

async function snapshot(database: RuntimeDatabase = db) {
  return { offers: await countRows(database, offers), projects: await countRows(database, projects), selections: await countRows(database, selections) };
}

async function countRows(database: RuntimeDatabase, table: PgTable) {
  const [row] = await database.select({ total: count() }).from(table);
  return row?.total ?? 0;
}

async function expectOfferError(code: OfferError["code"], action: () => Promise<unknown>, label: string) {
  try { await action(); } catch (error) { if (error instanceof OfferError && error.code === code) return; throw error; }
  throw new Error(`${label}: expected ${code}.`);
}

function now() { return new Date("2026-08-20T08:00:00.000Z"); }
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function assertCount(actual: number, expected: number, label: string) { if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}.`); }

main().catch((error) => { console.error(error); process.exit(1); });
