import "dotenv/config";

import { readFileSync } from "node:fs";

import {
  getDevelopmentApplicationActor,
  getMyApplicationForChallenge,
} from "@/services/application.service";

const APPLY_PAGE = "src/app/challenges/[id]/apply/page.tsx";
const APPLY_ACTIONS = "src/app/challenges/[id]/apply/actions.ts";
const APPLY_PANEL = "src/components/challenge/marketplace-apply-panel.tsx";

async function main() {
  const [page, actions, panel] = [APPLY_PAGE, APPLY_ACTIONS, APPLY_PANEL].map(
    (path) => readFileSync(path, "utf8")
  );

  for (const forbidden of [
    "@/lib/data/student",
    "@/lib/data/teams",
    "@/lib/data/peers",
    "lastMileTeam",
    "currentStudent",
    "Priya Raman",
    "Minh Anh Nguyen",
  ]) {
    assert(!page.includes(forbidden), `Apply page must not use static ${forbidden}.`);
  }

  assert(page.includes("getAuthenticatedActor"), "Apply page must resolve the authenticated actor.");
  assert(page.includes('hasActorCapability(resolution.actor, "STUDENT")'), "Apply page must require STUDENT capability.");
  assert(page.includes("getMyApplicationForChallenge"), "Apply page must detect an existing application.");
  assert(actions.includes("createApplication"), "Apply action must use the application service.");
  assert(actions.includes("toApplicationActorContext(resolution.actor)"), "Apply action must derive its actor server-side.");
  assert(panel.includes("Sign in to apply"), "Anonymous challenge CTA must direct users to sign in.");

  const jordan = await getDevelopmentApplicationActor("JORDAN_STUDENT_DEMO");
  const routeApplication = await getMyApplicationForChallenge("route-optimisation", jordan);
  assert(
    routeApplication?.publicId === "44444444-4444-4444-8444-000000000002",
    "Jordan must resolve the seeded route application through the service."
  );

  const faculty = await getDevelopmentApplicationActor("FACULTY_PHAM_DEMO");
  assert(!faculty.isStudent, "Faculty must not be represented as a student application actor.");

  console.log("Apply-flow integration verification passed.");
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
