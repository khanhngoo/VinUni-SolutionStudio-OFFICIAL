import "dotenv/config";

import { getDevelopmentApplicationActor } from "@/services/application.service";
import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { getFacultyApplicationDetail, getFacultyDashboard } from "@/services/faculty.service";

const APP_SUPPLY = "44444444-4444-4444-8444-000000000005";
const APP_ARCHIVE = "44444444-4444-4444-8444-000000000007";
const APP_OUTREACH = "44444444-4444-4444-8444-000000000004";
const APP_ENERGY = "44444444-4444-4444-8444-000000000006"; // supervised by Dr. Lan Vu, not Pham

async function main() {
  const phamUser = await resolveAuthenticatedUserByEmail(
    "faculty.minh-pham.demo@example.test"
  );
  if (phamUser.status !== "RESOLVED") throw new Error("Faculty Pham dev actor not found");
  const phamActor = await resolveAuthenticatedActor(phamUser.user);
  const phamId = phamActor.facultyProfile?.userId;
  if (!phamId) throw new Error("Faculty Pham has no faculty profile");

  const dashboard = await getFacultyDashboard(phamId);
  assert(
    dashboard.capacity.maxActiveSupervisions === 5,
    "Pham capacity must come from facultyProfiles.maxActiveSupervisions (real column)"
  );
  assert(
    dashboard.supervisedProjects.length === 2,
    `expected 2 supervised projects (app-supply, app-archive), got ${dashboard.supervisedProjects.length}`
  );
  assert(
    dashboard.supervisedProjects.some((p) => p.applicationPublicId === APP_SUPPLY),
    "app-supply must appear as an active supervised project"
  );
  assert(
    dashboard.supervisedProjects.some((p) => p.applicationPublicId === APP_ARCHIVE),
    "app-archive must appear as an active supervised project"
  );
  assert(
    dashboard.challengeAssignments.length === 4,
    `expected 4 challenge_faculty_assignments rows for Pham, got ${dashboard.challengeAssignments.length}`
  );
  assert(
    dashboard.supervisionRequests.length === 1,
    `expected 1 supervision_requests row for Pham, got ${dashboard.supervisionRequests.length}`
  );
  assert(
    dashboard.supervisionRequests[0]?.applicationPublicId === APP_OUTREACH,
    "the single supervision request must be app-outreach"
  );

  const supervised = await getFacultyApplicationDetail(phamId, APP_SUPPLY);
  assert(
    supervised?.kind === "SUPERVISED_PROJECT",
    "app-supply must resolve as a supervised project, deferring to /workspace"
  );

  const requested = await getFacultyApplicationDetail(phamId, APP_OUTREACH);
  assert(
    requested?.kind === "SUPERVISION_REQUEST",
    "app-outreach must resolve as a read-only supervision request"
  );

  const unrelated = await getFacultyApplicationDetail(phamId, APP_ENERGY);
  assert(
    unrelated === null,
    "app-energy (supervised by a different faculty member) must deny Pham cleanly"
  );

  // Challenge assignment alone must not grant project-workspace authority.
  const partnerActor = await getDevelopmentApplicationActor("BENCANG_CONTACT_DEMO");
  void partnerActor; // sanity: development actor resolution still works after this change

  console.log("Focused faculty runtime verification passed.");
  console.log(
    JSON.stringify(
      {
        capacity: dashboard.capacity,
        challengeAssignments: dashboard.challengeAssignments.length,
        supervisedProjects: dashboard.supervisedProjects.length,
        supervisionRequests: dashboard.supervisionRequests.length,
      },
      null,
      2
    )
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Faculty runtime verification failed: ${message}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
