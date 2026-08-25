import { sql } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export interface AuthenticatedUser {
  email: string;
  fullName: string;
  userId: bigint;
}

export type AuthenticatedUserResolution =
  | { status: "NO_SESSION" }
  | { status: "UNMAPPED" }
  | { status: "INACTIVE" }
  | { status: "RESOLVED"; user: AuthenticatedUser };

export class AuthenticatedUserError extends Error {
  constructor(public readonly code: Exclude<AuthenticatedUserResolution["status"], "RESOLVED">) {
    super(code === "NO_SESSION" ? "Authentication is required." : "This identity is not configured for Solutions Studio.");
    this.name = "AuthenticatedUserError";
  }
}

export function normalizeAuthenticationEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized && normalized.length <= 320 && normalized.includes("@") ? normalized : null;
}

export async function resolveAuthenticatedUserByEmail(email: string | null | undefined): Promise<AuthenticatedUserResolution> {
  const normalizedEmail = typeof email === "string" ? normalizeAuthenticationEmail(email) : null;
  if (!normalizedEmail) return { status: "NO_SESSION" };

  const [user] = await db
    .select({ email: users.email, fullName: users.fullName, status: users.status, userId: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!user) return { status: "UNMAPPED" };
  if (user.status !== "ACTIVE") return { status: "INACTIVE" };

  return { status: "RESOLVED", user: { email: user.email, fullName: user.fullName, userId: user.userId } };
}

export async function isAuthorizedUserEmail(email: string | null | undefined) {
  return (await resolveAuthenticatedUserByEmail(email)).status === "RESOLVED";
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUserResolution> {
  const { auth } = await import("../../auth");
  const session = await auth();
  return resolveAuthenticatedUserByEmail(session?.user?.email);
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const resolution = await getAuthenticatedUser();
  if (resolution.status !== "RESOLVED") throw new AuthenticatedUserError(resolution.status);
  return resolution.user;
}
