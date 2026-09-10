import "dotenv/config";

import { eq } from "drizzle-orm";

import { getDevelopmentIdentity } from "@/auth/development-identities";
import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import {
  getAdminOverview,
  listAdminApplications,
  listAdminChallenges,
  listAdminOrganizations,
  listAdminProjects,
  listAdminUsers,
} from "@/db/queries/admin";
import { db } from "@/db";
import { userPlatformRoles } from "@/db/schema";
import { hasPlatformOwnerCapability, requirePlatformOwner, PlatformOwnerRequiredError } from "@/services/platform-admin-policy";
import { grantPlatformOwner, revokePlatformOwner } from "@/services/platform-admin.service";

/**
 * Phase 6.6 Checkpoint D verifier: the `requirePlatformOwner` gate every
 * `/admin` layout/page calls, exercised against the full persona matrix from
 * `context/admin-console-implementation-plan.md` Section 16.5, plus basic
 * sanity checks on the read-only `src/db/queries/admin.ts` models
 * (pagination bounds, deterministic ordering, non-negative counts). This is
 * a direct-route authorization test in the sense the repository's other
 * `verify-*.ts` scripts already use: it calls the same functions the routes
 * call, not a browser. Full browser/runtime persona coverage (redirects,
 * DOM, console) is Checkpoint H's formal deliverable; this session also
 * manually verified anonymous/student/CAID/E-Lab/owner personas against the
 * live `/admin` routes in a real browser.
 */
async function main() {
  const caidAdmin = await resolveDevelopmentActor("CAID_ADMIN_DEMO");
  const elabAdmin = await resolveDevelopmentActor("ELAB_ADMIN_DEMO");
  const jordan = await resolveDevelopmentActor("JORDAN_STUDENT_DEMO");
  const faculty = await resolveDevelopmentActor("FACULTY_PHAM_DEMO");
  const partner = await resolveDevelopmentActor("BENCANG_CONTACT_DEMO");

  await cleanup([caidAdmin.user.userId, elabAdmin.user.userId]);

  try {
    // --- Persona matrix (Section 16.5), minus anonymous/redirect handling,
    // which is `getAuthenticatedActor()`'s concern and is covered by
    // `scripts/verify-auth-architecture.ts`. ---
    for (const [label, actor] of [
      ["CAID admin (no platform role)", caidAdmin],
      ["E-Lab admin (no platform role)", elabAdmin],
      ["student", jordan],
      ["faculty", faculty],
      ["partner representative", partner],
    ] as const) {
      assert(!hasPlatformOwnerCapability(actor), `${label} must not have PLATFORM_OWNER capability`);
      assertThrows(() => requirePlatformOwner(actor), PlatformOwnerRequiredError, `requirePlatformOwner must reject ${label}`);
    }

    // --- Grant, verify the gate opens, revoke, verify it closes again.
    // A second owner (E-Lab admin) is granted alongside so the revoke below
    // does not hit last-owner protection — that invariant is already
    // covered in depth by `scripts/verify-platform-admin.ts` (Checkpoint C);
    // this script only needs the gate to react correctly to the role
    // change. ---
    await grantPlatformOwner({ targetUserId: caidAdmin.user.userId, grantedBy: null });
    await grantPlatformOwner({
      targetUserId: elabAdmin.user.userId,
      grantedBy: null,
      allowAdditionalOwner: true,
    });
    const ownerActor = await resolveAuthenticatedActor(caidAdmin.user);
    assert(hasPlatformOwnerCapability(ownerActor), "granted owner must pass hasPlatformOwnerCapability");
    requirePlatformOwner(ownerActor); // must not throw

    await revokePlatformOwner({ targetUserId: caidAdmin.user.userId, revokedBy: elabAdmin.user.userId });
    const revokedActor = await resolveAuthenticatedActor(caidAdmin.user);
    assert(!hasPlatformOwnerCapability(revokedActor), "revoked owner must fail hasPlatformOwnerCapability");
    assertThrows(
      () => requirePlatformOwner(revokedActor),
      PlatformOwnerRequiredError,
      "requirePlatformOwner must reject a revoked owner"
    );

    // --- Query sanity: bounded, deterministic, non-negative (a lighter
    // pass than Checkpoint H's formal Query Verifier). ---
    const overview = await getAdminOverview();
    assert(overview.users.total >= 0, "overview user total must be non-negative");
    assert(
      overview.users.byStatus.reduce((sum, row) => sum + row.count, 0) <= overview.users.total,
      "status breakdown must not exceed the total"
    );

    const usersPage = await listAdminUsers({ page: 1 });
    assert(usersPage.items.length <= usersPage.pageSize, "user list must respect its page size");
    assert(usersPage.page === 1 && usersPage.hasPreviousPage === false, "page 1 must never claim a previous page");
    const userIdsDescending = usersPage.items.every(
      (item, index) => index === 0 || item.id < usersPage.items[index - 1]!.id
    );
    assert(userIdsDescending, "user list must be deterministically ordered (newest id first)");

    const orgsPage = await listAdminOrganizations({ page: 1 });
    assert(orgsPage.items.length <= orgsPage.pageSize, "organization list must respect its page size");

    const challengesPage = await listAdminChallenges({ page: 1 });
    assert(challengesPage.items.length <= challengesPage.pageSize, "challenge list must respect its page size");

    const applicationsPage = await listAdminApplications({ page: 1 });
    assert(applicationsPage.items.length <= applicationsPage.pageSize, "application list must respect its page size");

    const projectsPage = await listAdminProjects({ page: 1 });
    assert(projectsPage.items.length <= projectsPage.pageSize, "project list must respect its page size");

    // --- An out-of-range page must return an empty page, not throw or wrap. ---
    const farPage = await listAdminUsers({ page: 10_000 });
    assert(farPage.items.length === 0, "a far-out-of-range page must return no rows, not an error");
    assert(farPage.page === 10_000, "requested page number must be echoed back even when empty");

    console.log("Phase 6.6 Checkpoint D admin-shell verification passed.");
  } finally {
    await cleanup([caidAdmin.user.userId, elabAdmin.user.userId]);
  }
}

async function cleanup(userIds: bigint[]) {
  for (const userId of userIds) {
    await db.delete(userPlatformRoles).where(eq(userPlatformRoles.userId, userId));
  }
}

async function resolveDevelopmentActor(key: Parameters<typeof getDevelopmentIdentity>[0]) {
  const identity = getDevelopmentIdentity(key);
  if (!identity) throw new Error(`Missing development identity ${key}.`);
  const resolution = await resolveAuthenticatedUserByEmail(identity.email);
  if (resolution.status !== "RESOLVED") throw new Error(`${identity.email} must resolve to an active seeded user.`);
  return resolveAuthenticatedActor(resolution.user);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertThrows(fn: () => void, ctor: new (...args: never[]) => Error, message: string) {
  try {
    fn();
  } catch (error) {
    if (error instanceof ctor) return;
    throw new Error(`${message} (threw the wrong error type: ${String(error)})`);
  }
  throw new Error(`${message} (did not throw)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
