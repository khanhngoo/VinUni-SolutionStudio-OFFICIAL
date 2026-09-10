import "dotenv/config";

import { resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";
import {
  grantPlatformOwner,
  revokePlatformOwner,
  PlatformAdminError,
} from "@/services/platform-admin.service";

/**
 * Guarded Phase 6.6 `PLATFORM_OWNER` bootstrap/recovery command. Never
 * creates a user and never accepts a password — it only attaches or removes
 * a `user_platform_roles` row for an existing ACTIVE user, resolved by exact,
 * case-insensitive email match. Every outcome is written as an audit event
 * in the same transaction as the role change (see
 * `src/services/platform-admin.service.ts`).
 *
 * Usage:
 *   ALLOW_PLATFORM_OWNER_BOOTSTRAP=true pnpm admin:grant-owner -- --email owner@example.com
 *   ALLOW_PLATFORM_OWNER_BOOTSTRAP=true pnpm admin:grant-owner -- --email owner2@example.com --allow-additional-owner
 *   ALLOW_PLATFORM_OWNER_BOOTSTRAP=true pnpm admin:grant-owner -- --revoke --email owner@example.com
 */

interface ParsedArgs {
  email: string | null;
  revoke: boolean;
  allowAdditionalOwner: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { email: null, revoke: false, allowAdditionalOwner: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--email") {
      args.email = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith("--email=")) {
      args.email = arg.slice("--email=".length);
    } else if (arg === "--revoke") {
      args.revoke = true;
    } else if (arg === "--allow-additional-owner") {
      args.allowAdditionalOwner = true;
    } else {
      throw new Error(`REFUSED: unrecognized argument "${arg}".`);
    }
  }

  return args;
}

async function main() {
  if (process.env.ALLOW_PLATFORM_OWNER_BOOTSTRAP !== "true") {
    throw new Error(
      "REFUSED: set ALLOW_PLATFORM_OWNER_BOOTSTRAP=true to run this command."
    );
  }

  const args = parseArgs(process.argv.slice(2));

  if (!args.email) {
    throw new Error("REFUSED: --email <address> is required.");
  }
  if (args.revoke && args.allowAdditionalOwner) {
    throw new Error("REFUSED: --revoke and --allow-additional-owner are mutually exclusive.");
  }

  const resolution = await resolveAuthenticatedUserByEmail(args.email);

  if (resolution.status === "NO_SESSION") {
    throw new Error(`REFUSED: "${args.email}" is not a well-formed email address.`);
  }
  if (resolution.status === "UNMAPPED") {
    throw new Error(`REFUSED: no user exists for "${args.email}".`);
  }
  if (resolution.status === "INACTIVE") {
    throw new Error(`REFUSED: the user for "${args.email}" is not ACTIVE.`);
  }

  const { user } = resolution;
  console.log(`Target identity: ${user.email} (user id ${user.userId}).`);

  if (args.revoke) {
    const result = await revokePlatformOwner({ targetUserId: user.userId, revokedBy: null });
    console.log(`Outcome: ${result.outcome} (platform_role id ${result.platformRoleId}).`);
    return;
  }

  const result = await grantPlatformOwner({
    targetUserId: user.userId,
    grantedBy: null,
    allowAdditionalOwner: args.allowAdditionalOwner,
  });
  console.log(`Outcome: ${result.outcome} (platform_role id ${result.platformRoleId}).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof PlatformAdminError) {
      console.error(`REFUSED (${error.code}): ${error.message}`);
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exit(1);
  });
