import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { milestoneReviews, milestones, supervisionRequests } from "../src/db/schema";
import { getFacultyQueue } from "../src/services/faculty.service";
import { respondToSupervisionRequest } from "../src/services/supervision.service";
import { recordFacultyMilestoneReview } from "../src/services/milestone-review.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const ROLLBACK = new Error("rollback");

async function main() {
  const failures: string[] = [];
  const actor = await getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test");

  const queue = await getFacultyQueue(actor.user.userId);
  console.log(`load: ${queue.load.slotsUsed}/${queue.load.slotsTotal} slots`);
  console.log(`invites: ${queue.invites.length}`);
  for (const i of queue.invites) console.log(`  ${i.challengeTitle} · ${i.teamName} · team of ${i.teamSize} · ${i.daysLeft}d`);
  console.log(`milestones: ${queue.milestones.length}`);
  for (const m of queue.milestones) console.log(`  ${m.challengeTitle} — ${m.milestoneTitle} · due ${m.dueDate} · ${m.daysLeft}d · action=${m.actionNeeded} partner=${m.partnerApproved}`);
  console.log(`feedback: ${queue.feedback.length}`);
  for (const f of queue.feedback) console.log(`  ${f.challengeTitle} · ${f.teamName} · ${f.daysLeft}d`);
  console.log(`settled: ${queue.settled.length}`);

  if (queue.invites.length === 0) failures.push("no pending supervision request seeded — accept/decline is unexercised");
  if (queue.milestones.length === 0) failures.push("no submitted milestone seeded — sign-off is unexercised");

  // --- write paths, rolled back ---
  if (queue.invites.length > 0) {
    const requestId = BigInt(queue.invites[0].requestId);
    try {
      await db.transaction(async (tx) => {
        await respondToSupervisionRequest(requestId, "ACCEPT", actor, { database: tx });
        const [row] = await tx.select({ status: supervisionRequests.status }).from(supervisionRequests).where(eq(supervisionRequests.id, requestId));
        console.log(`\naccept -> supervision_requests.status = ${row.status}`);
        if (row.status !== "ACCEPTED") failures.push("accepting did not move the request to ACCEPTED");

        // second answer on the same request must conflict
        try {
          await respondToSupervisionRequest(requestId, "DECLINE", actor, { database: tx });
          failures.push("a second response to the same request was accepted");
        } catch { console.log("second response correctly rejected as a conflict"); }
        throw ROLLBACK;
      });
    } catch (e) { if (e !== ROLLBACK) throw e; }
  }

  if (queue.milestones.length > 0) {
    const target = queue.milestones.find((m) => m.actionNeeded) ?? queue.milestones[0];
    const milestoneId = BigInt(target.milestoneId);
    try {
      await db.transaction(async (tx) => {
        await recordFacultyMilestoneReview(milestoneId, "APPROVED", null, actor, { database: tx });
        const reviews = await tx.select({ role: milestoneReviews.reviewerRole, decision: milestoneReviews.decision }).from(milestoneReviews).where(eq(milestoneReviews.milestoneId, milestoneId));
        const [ms] = await tx.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, milestoneId));
        console.log(`\nfaculty approve on "${target.milestoneTitle}":`);
        for (const r of reviews) console.log(`  ${r.role} ${r.decision}`);
        console.log(`  milestone status -> ${ms.status}`);
        const partnerApproved = reviews.some((r) => (r.role === "PARTNER" || r.role === "MANAGING_ORGANIZATION") && r.decision === "APPROVED");
        if (!partnerApproved && ms.status === "COMPLETED") failures.push("milestone completed on a single sign-off — dual sign-off not enforced");
        if (partnerApproved && ms.status !== "COMPLETED") failures.push("both sides approved but the milestone did not complete");
        throw ROLLBACK;
      });
    } catch (e) { if (e !== ROLLBACK) throw e; }
  }

  if (failures.length > 0) {
    console.error("\nFAILED:"); for (const f of failures) console.error(`  - ${f}`); process.exit(1);
  }
  console.log("\nFaculty queue reads and both write paths behave.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
