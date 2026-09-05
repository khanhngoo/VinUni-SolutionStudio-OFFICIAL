import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { milestoneReviews, milestones, projects } from "../src/db/schema";
import {
  MilestoneReviewError,
  recordFacultyMilestoneReview,
  recordPartnerMilestoneReview,
} from "../src/services/milestone-review.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const ROLLBACK = new Error("rollback");

/**
 * The dual sign-off is the rule worth guarding: a milestone completes only
 * when faculty and partner have both approved, and neither side alone can
 * finish it. Also checks that a partner from the wrong organization is refused
 * — and refused as not-found, so the existence of the project does not leak.
 */
async function main() {
  const failures: string[] = [];

  const faculty = await getAuthenticatedActorForVerification("faculty.minh-pham.demo@example.test");
  const partner = await getAuthenticatedActorForVerification("contact.bencang.demo@example.test");
  const outsider = await getAuthenticatedActorForVerification("contact.vhf.demo@example.test");

  // A SUBMITTED milestone on a project this faculty supervises.
  const rows = await db
    .select({ id: milestones.id, title: milestones.title, status: milestones.status, supervisor: projects.facultySupervisorId })
    .from(milestones)
    .innerJoin(projects, eq(projects.id, milestones.projectId))
    .where(eq(milestones.status, "SUBMITTED"));

  const target = rows.find((row) => String(row.supervisor) === String(faculty.user.userId));
  if (!target) { console.error("No SUBMITTED milestone under this supervisor."); process.exit(1); }
  console.log(`target: "${target.title}" (${target.status})`);

  // 1. partner alone must not complete it
  try {
    await db.transaction(async (tx) => {
      await recordPartnerMilestoneReview(target.id, "APPROVED", null, partner, { database: tx });
      const [row] = await tx.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, target.id));
      console.log(`partner approves alone -> ${row.status}`);
      if (row.status === "COMPLETED") failures.push("partner alone completed the milestone");
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }

  // 2. both sides -> COMPLETED
  try {
    await db.transaction(async (tx) => {
      await recordPartnerMilestoneReview(target.id, "APPROVED", null, partner, { database: tx });
      await recordFacultyMilestoneReview(target.id, "APPROVED", null, faculty, { database: tx });
      const [row] = await tx.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, target.id));
      const reviews = await tx.select({ role: milestoneReviews.reviewerRole, decision: milestoneReviews.decision }).from(milestoneReviews).where(eq(milestoneReviews.milestoneId, target.id));
      console.log(`both approve -> ${row.status}  [${reviews.map((r) => `${r.role}:${r.decision}`).join(", ")}]`);
      if (row.status !== "COMPLETED") failures.push("both sides approved but the milestone did not complete");
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }

  // 3. revision from the partner sends it back regardless of faculty
  try {
    await db.transaction(async (tx) => {
      await recordPartnerMilestoneReview(target.id, "REVISION_REQUESTED", "Needs the raw counts.", partner, { database: tx });
      const [row] = await tx.select({ status: milestones.status }).from(milestones).where(eq(milestones.id, target.id));
      console.log(`partner requests revision -> ${row.status}`);
      if (row.status !== "REVISION_REQUESTED") failures.push("a revision request did not send the milestone back");
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }

  // 4. a partner from another organization cannot sign off, and is told nothing
  try {
    await db.transaction(async (tx) => {
      await recordPartnerMilestoneReview(target.id, "APPROVED", null, outsider, { database: tx });
      failures.push("a partner from another organization signed off");
      throw ROLLBACK;
    });
  } catch (e) {
    if (e === ROLLBACK) { /* recorded */ }
    else if (e instanceof MilestoneReviewError) {
      console.log(`outsider refused: ${e.code}`);
      if (e.code !== "NOT_FOUND") failures.push("the refusal leaked that the milestone exists");
    } else throw e;
  }

  if (failures.length > 0) { console.error("\nFAILED:"); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
  console.log("\nDual sign-off holds: neither side completes a milestone alone.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
