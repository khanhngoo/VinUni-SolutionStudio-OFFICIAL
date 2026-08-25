import "dotenv/config";

import { getDevelopmentIdentity } from "@/auth/development-identities";
import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { toApplicationActorContext } from "@/services/application.service";
import { getAssessmentPreflight, AssessmentError } from "@/services/assessment.service";
import { getMarketplaceChallengeBySlug, listMarketplaceChallenges } from "@/services/challenge.service";
import { getOfferDetail, OfferError } from "@/services/offer.service";
import { getMeetingDetail, getWorkspaceDetail, WorkspaceError } from "@/services/workspace.service";

const APP_CHURN = "44444444-4444-4444-8444-000000000003";
const APP_ROUTE = "44444444-4444-4444-8444-000000000002";
const APP_SUPPLY = "44444444-4444-4444-8444-000000000005";

async function main() {
  const jordan = await actor("JORDAN_STUDENT_DEMO");
  const bao = await actor("BAO_STUDENT_DEMO");
  const partner = await actor("BENCANG_CONTACT_DEMO");
  const caid = await actor("CAID_ADMIN_DEMO");
  const elab = await actor("ELAB_ADMIN_DEMO");

  assert(marketplaceContextForActor(null).audience === "ANONYMOUS", "no session must be anonymous");
  assert(marketplaceContextForActor(partner).audience === "EXTERNAL_PARTNER", "partner must not be a generic VinUni viewer");
  const anonymous = await listMarketplaceChallenges({}, marketplaceContextForActor(null));
  const external = await listMarketplaceChallenges({}, marketplaceContextForActor(partner));
  const internal = await listMarketplaceChallenges({}, marketplaceContextForActor(jordan));
  assert(anonymous.items.every((item) => item.visibility === "PUBLIC_PREVIEW"), "anonymous visibility leaked");
  assert(external.items.every((item) => item.visibility === "PUBLIC_PREVIEW"), "external partner gained VINUNI_ONLY visibility");
  assert(internal.items.length >= anonymous.items.length, "internal marketplace scope regressed");

  // The full brief is T3 content — the payoff for being selected. No amount of
  // browsing may reach it, whoever is browsing.
  const BRIEFED_SLUG = "supply-chain-dashboard";
  for (const [label, viewer] of [
    ["anonymous", null],
    ["external partner", partner],
    ["internal student", jordan],
  ] as const) {
    const detail = await getMarketplaceChallengeBySlug(
      BRIEFED_SLUG,
      marketplaceContextForActor(viewer)
    );
    assert(
      detail === null || detail.fullBrief === null,
      `${label} viewer read the full brief from the marketplace`
    );
  }

  await expectError(() => getAssessmentPreflight(APP_CHURN, toApplicationActorContext(bao)), AssessmentError, "FORBIDDEN", "unrelated student assessment");
  assert(await getAssessmentPreflight(APP_CHURN, toApplicationActorContext(jordan)), "assessment owner denied");
  await expectError(() => getOfferDetail(APP_ROUTE, toApplicationActorContext(bao)), OfferError, "FORBIDDEN", "unrelated student offer");
  assert(await getOfferDetail(APP_ROUTE, toApplicationActorContext(jordan)), "application member offer denied");
  await expectError(() => getWorkspaceDetail(APP_SUPPLY, toApplicationActorContext(bao)), WorkspaceError, "FORBIDDEN", "unrelated student workspace");
  assert(await getWorkspaceDetail(APP_SUPPLY, toApplicationActorContext(jordan)), "project member workspace denied");

  // A meeting URL must be no more reachable than the workspace it belongs to.
  const SUPPLY_MEETING = "66666666-6666-4666-8666-000000000002";
  await expectError(() => getMeetingDetail(SUPPLY_MEETING, toApplicationActorContext(bao)), WorkspaceError, "FORBIDDEN", "unrelated student meeting");
  assert(await getMeetingDetail(SUPPLY_MEETING, toApplicationActorContext(jordan)), "project member meeting denied");

  const caidScope = marketplaceContextForActor(caid).organizationMemberships?.map((membership) => membership.organizationId.toString()) ?? [];
  const elabScope = marketplaceContextForActor(elab).organizationMemberships?.map((membership) => membership.organizationId.toString()) ?? [];
  assert(!caidScope.some((id) => elabScope.includes(id)), "CAID actor acquired E-Lab organization scope");
  assert(!elabScope.some((id) => caidScope.includes(id)), "E-Lab actor acquired CAID organization scope");
  console.log("Phase 6.3 authorization verification passed.");
}

async function actor(key: Parameters<typeof getDevelopmentIdentity>[0]) {
  const identity = getDevelopmentIdentity(key);
  if (!identity) throw new Error(`Missing development identity ${key}.`);
  const user = await resolveAuthenticatedUserByEmail(identity.email);
  if (user.status !== "RESOLVED") throw new Error(`Unresolved user ${key}.`);
  return resolveAuthenticatedActor(user.user);
}

async function expectError<T extends { code: string }>(action: () => Promise<unknown>, type: new (...args: never[]) => T, code: string, label: string) {
  try { await action(); } catch (error) {
    if (error instanceof type && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => { console.error(error); process.exit(1); });
