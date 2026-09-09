import "dotenv/config";
import { and, eq } from "drizzle-orm";

import { db } from "../src/db";
import { applicationMembers, applications } from "../src/db/schema";
import { listPendingTeamInvitations } from "../src/db/queries/applications";
import { InvitationError, respondToInvitation } from "../src/services/invitation.service";
import { getAuthenticatedActorForVerification } from "./_actor";

const ROLLBACK = new Error("rollback");

/**
 * Checks that a team invitation can be answered, once, and only by its
 * invitee. The last part is the one worth guarding: the membership is matched
 * on the actor's own student id, so there is no id in the request that could
 * be swapped for someone else's seat.
 */
async function main() {
  const failures: string[] = [];

  // Find whoever currently holds a pending invitation.
  const pendingRows = await db
    .select({ applicationId: applicationMembers.applicationId, studentId: applicationMembers.studentId })
    .from(applicationMembers)
    .where(eq(applicationMembers.status, "INVITED"));

  if (pendingRows.length === 0) {
    console.error("No INVITED membership seeded — the invitation flow is unexercised.");
    process.exit(1);
  }

  const [{ applicationId, studentId }] = pendingRows;
  const [application] = await db.select({ publicId: applications.publicId }).from(applications).where(eq(applications.id, applicationId)).limit(1);

  const invitee = await getAuthenticatedActorForVerificationById(studentId);
  const outsider = await getAuthenticatedActorForVerification("student.linh-pham.demo@example.test");

  const listed = await listPendingTeamInvitations(db, invitee.user.userId);
  console.log(`pending invitations for ${invitee.user.fullName}: ${listed.length}`);
  for (const row of listed) console.log(`  ${row.leaderName} -> ${row.teamName} · ${row.challengeTitle}`);
  if (listed.length === 0) failures.push("the invitee's own pending invitation did not list");

  try {
    await db.transaction(async (tx) => {
      await respondToInvitation(application.publicId, "ACCEPT", invitee, { database: tx });
      const [row] = await tx.select({ status: applicationMembers.status }).from(applicationMembers)
        .where(and(eq(applicationMembers.applicationId, applicationId), eq(applicationMembers.studentId, studentId)));
      console.log(`\naccept -> application_members.status = ${row.status}`);
      if (row.status !== "ACCEPTED") failures.push("accepting did not move the membership to ACCEPTED");

      try {
        await respondToInvitation(application.publicId, "DECLINE", invitee, { database: tx });
        failures.push("a second answer to the same invitation was accepted");
      } catch (e) {
        if (e instanceof InvitationError) console.log("second answer correctly rejected as a conflict");
        else throw e;
      }
      throw ROLLBACK;
    });
  } catch (e) { if (e !== ROLLBACK) throw e; }

  // Someone who is not on this team must not be able to answer for it.
  if (String(outsider.user.userId) !== String(studentId)) {
    try {
      await db.transaction(async (tx) => {
        await respondToInvitation(application.publicId, "ACCEPT", outsider, { database: tx });
        failures.push("a student who was never invited answered the invitation");
        throw ROLLBACK;
      });
    } catch (e) {
      if (e === ROLLBACK) { /* failure already recorded */ }
      else if (e instanceof InvitationError) console.log("an uninvited student correctly could not answer");
      else throw e;
    }
  }

  if (failures.length > 0) { console.error("\nFAILED:"); for (const f of failures) console.error(`  - ${f}`); process.exit(1); }
  console.log("\nInvitations list, answer once, and only for their own invitee.");
  process.exit(0);
}

async function getAuthenticatedActorForVerificationById(studentId: bigint) {
  const { users } = await import("../src/db/schema");
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, studentId)).limit(1);
  return getAuthenticatedActorForVerification(row.email);
}

main().catch((e) => { console.error(e); process.exit(1); });
