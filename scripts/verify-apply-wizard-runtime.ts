import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { applicationMembers, applications, users } from "../src/db/schema";
import {
  getStudentTeamProfile,
  listFacultyOptions,
  listInvitablePeers,
  resolveStudentEmailsByUserId,
} from "../src/db/queries/students";
import { toFaculty, toPeer } from "../src/lib/apply-view";

const APPLICANT = "student.jordan-lee.demo@example.test";

/**
 * Checks the reads behind the four-step apply wizard, and the privacy boundary
 * the invite picker depends on.
 *
 * The boundary is the point: the picker runs in the browser, so `PeerRead` must
 * not carry an email. Invitations travel as ids and only the server resolves
 * them, which is what `resolveStudentEmailsByUserId` exists for.
 */
async function main() {
  const failures: string[] = [];

  const [applicant] = await db
    .select({ id: users.id, name: users.fullName })
    .from(users)
    .where(eq(users.email, APPLICANT))
    .limit(1);

  if (!applicant) {
    console.error(`No seeded applicant ${APPLICANT}`);
    process.exit(1);
  }

  const peers = await listInvitablePeers(db, applicant.id);
  console.log(`invitable peers for ${applicant.name}: ${peers.length}`);
  for (const peer of peers.map(toPeer)) {
    console.log(
      `  ${peer.name.padEnd(18)} ${peer.major.padEnd(24)} y${peer.year} ${String(peer.hoursAvailable).padStart(2)}h  roles=[${peer.roles.join(", ")}]  live=${peer.liveChallenges}`
    );
    if (peer.weeklyAvailability.length !== 7) {
      failures.push(`${peer.name}: availability is not 7 slots after adaptation`);
    }
  }

  if (peers.some((peer) => String(peer.userId) === String(applicant.id))) {
    failures.push("the applicant appears in their own invitable peer list");
  }

  // The picker is a client component; an email reaching it would be a leak.
  const leaked = Object.keys(peers[0] ?? {}).filter((key) =>
    key.toLowerCase().includes("email")
  );
  if (leaked.length > 0) {
    failures.push(`PeerRead exposes ${leaked.join(", ")} to the browser`);
  }

  const ids = peers.slice(0, 2).map((peer) => peer.userId);
  const emails = await resolveStudentEmailsByUserId(db, ids);
  console.log(`\nserver-side id -> email resolution: ${emails.size} of ${ids.length}`);
  if (emails.size !== ids.length) {
    failures.push("server could not resolve every invitable peer to an email");
  }

  const bogus = await resolveStudentEmailsByUserId(db, [BigInt(9999999)]);
  if (bogus.size !== 0) {
    failures.push("a non-existent user id resolved to an email");
  }

  const faculty = await listFacultyOptions(db);
  console.log(`\nfaculty options: ${faculty.length}`);
  for (const option of faculty.map(toFaculty)) {
    console.log(
      `  ${option.name.padEnd(20)} ${option.title.padEnd(22)} ${option.department.padEnd(24)} ${option.slotsUsed}/${option.slotsTotal}`
    );
    if (option.slotsTotal > 0 && option.slotsUsed > option.slotsTotal) {
      failures.push(`${option.name}: supervising more projects than their stated capacity`);
    }
  }
  if (faculty.length === 0) {
    failures.push("no faculty options — the supervisor step would be unusable");
  }

  const profile = await getStudentTeamProfile(db, applicant.id);
  console.log(
    `\napplicant team profile: ${profile?.major}, y${profile?.studyYear}, ${profile?.hoursAvailable}h, roles=[${profile?.roles.join(", ")}]`
  );
  if (!profile) failures.push("applicant has no team profile — the leader row would be blank");

  // One LEADER per application is a partial unique index, not a convention.
  const rows = await db
    .select({ applicationId: applicationMembers.applicationId, role: applicationMembers.memberRole })
    .from(applicationMembers)
    .innerJoin(applications, eq(applications.id, applicationMembers.applicationId));
  const leadersPerApplication = new Map<string, number>();
  for (const row of rows) {
    if (row.role !== "LEADER") continue;
    const key = String(row.applicationId);
    leadersPerApplication.set(key, (leadersPerApplication.get(key) ?? 0) + 1);
  }
  const multiLeader = [...leadersPerApplication.values()].filter((count) => count > 1);
  if (multiLeader.length > 0) {
    failures.push(`${multiLeader.length} application(s) have more than one LEADER`);
  }
  console.log(`\napplications with exactly one leader: ${leadersPerApplication.size}`);

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nApply wizard reads are sound and the invite privacy boundary holds.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
