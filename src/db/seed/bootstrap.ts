import type { SeedContext } from "./context";
import {
  BOOTSTRAP_ORGANIZATIONS,
  ensureBootstrapOrganization,
} from "./organizations";
import {
  DEVELOPMENT_ADMIN_USERS,
  ensureDevelopmentAdminMembership,
  ensureDevelopmentAdminUser,
} from "./users";

export async function seedBootstrap(ctx: SeedContext) {
  for (const organization of BOOTSTRAP_ORGANIZATIONS) {
    await ensureBootstrapOrganization(ctx, organization);
  }

  ctx.record("BOOTSTRAP", "organizations", BOOTSTRAP_ORGANIZATIONS.length);

  for (const user of DEVELOPMENT_ADMIN_USERS) {
    await ensureDevelopmentAdminUser(ctx, user);
  }

  ctx.record("BOOTSTRAP", "users", DEVELOPMENT_ADMIN_USERS.length);

  for (const user of DEVELOPMENT_ADMIN_USERS) {
    await ensureDevelopmentAdminMembership(ctx, user);
  }

  ctx.record("BOOTSTRAP", "memberships", DEVELOPMENT_ADMIN_USERS.length);
}
