import "dotenv/config";

import { and, eq, sql } from "drizzle-orm";

import {
  isDevelopmentPersonaProvisioningEnabled,
  registerSelfServiceUser,
  SelfServiceAuthenticationError,
} from "@/auth/self-service-authentication";
import type { DevelopmentPersona } from "@/auth/development-personas";
import { db } from "@/db";
import { facultyProfiles, organizationMemberships, organizations, studentProfiles, userCredentials, users } from "@/db/schema";

const ROLLBACK = Symbol("rollback persona verification");
const prefix = `persona-verifier-${Date.now()}`;
const password = "LocalVerifier2026";

async function expectError(code: SelfServiceAuthenticationError["code"], action: () => Promise<unknown>) {
  try { await action(); } catch (error) {
    if (error instanceof SelfServiceAuthenticationError && error.code === code) return;
    throw error;
  }
  throw new Error(`Expected ${code}`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function main() {
  const runtimeEnvironment = process.env as Record<string, string | undefined>;
  const previous = process.env.AUTH_DEV_PERSONAS_ENABLED;
  const previousEnvironment = process.env.NODE_ENV;
  const cases: { persona: DevelopmentPersona; partnerOrganization?: string; organization?: string; role?: string }[] = [
    { persona: "STUDENT" },
    { persona: "FACULTY" },
    { persona: "PARTNER", partnerOrganization: "BENCANG", organization: "Bến Cảng Logistics", role: "CONTACT_PERSON" },
    { persona: "CAID_ADMIN", organization: "CAID", role: "ADMIN" },
    { persona: "ELAB_ADMIN", organization: "E-Lab", role: "ADMIN" },
  ];
  const before = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  try {
    process.env.AUTH_DEV_PERSONAS_ENABLED = "true";
    assert(isDevelopmentPersonaProvisioningEnabled(), "test requires non-production self-service signup");
    assert(!isDevelopmentPersonaProvisioningEnabled("production", "true"), "production gate opened");
    assert(!isDevelopmentPersonaProvisioningEnabled("", "true"), "missing environment opened gate");
    assert(!isDevelopmentPersonaProvisioningEnabled("development", "false"), "disabled gate opened");

    runtimeEnvironment.NODE_ENV = "production";
    await expectError("DISABLED", () => registerSelfServiceUser({ email: `${prefix}-production@example.test`,
      fullName: "Production Probe", password, persona: "CAID_ADMIN" }));
    runtimeEnvironment.NODE_ENV = "development";

    // All successful registrations and the seeded-record fault injection are
    // enclosed in a rollback so baseline accounts and organizations survive.
    try {
      await db.transaction(async (tx) => {
        for (const [index, entry] of cases.entries()) {
          const email = `${prefix}-${index}@example.test`;
          const account = await registerSelfServiceUser({ email, fullName: `Verifier ${index}`, password,
            persona: entry.persona, partnerOrganization: entry.partnerOrganization }, { database: tx });
          const credentials = await tx.select().from(userCredentials).where(eq(userCredentials.userId, account.userId));
          const students = await tx.select().from(studentProfiles).where(eq(studentProfiles.userId, account.userId));
          const faculty = await tx.select().from(facultyProfiles).where(eq(facultyProfiles.userId, account.userId));
          const memberships = await tx.select({ organization: organizations.name, role: organizationMemberships.role, status: organizationMemberships.status })
            .from(organizationMemberships).innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
            .where(eq(organizationMemberships.userId, account.userId));
          assert(credentials.length === 1, `${entry.persona}: credentials count`);
          assert(students.length === Number(entry.persona === "STUDENT"), `${entry.persona}: student count`);
          assert(faculty.length === Number(entry.persona === "FACULTY"), `${entry.persona}: faculty count`);
          assert(memberships.length === Number(Boolean(entry.organization)), `${entry.persona}: membership count`);
          if (entry.organization) assert(memberships[0].organization === entry.organization &&
            memberships[0].role === entry.role && memberships[0].status === "ACTIVE", `${entry.persona}: wrong scope`);
          await expectError("EMAIL_UNAVAILABLE", () => registerSelfServiceUser({ email, fullName: "Retry", password,
            persona: "CAID_ADMIN" }, { database: tx }));
        }

        for (const value of ["999999999", "CAID", "E-Lab", "<bad>", "ELAB_ADMIN"]) {
          await expectError("VALIDATION_ERROR", () => registerSelfServiceUser({
            email: `${prefix}-bad-${value}@example.test`, fullName: "Bad Partner", password,
            persona: "PARTNER", partnerOrganization: value,
          }, { database: tx }));
        }

        process.env.AUTH_DEV_PERSONAS_ENABLED = "false";
        await expectError("DISABLED", () => registerSelfServiceUser({ email: `${prefix}-closed@example.test`,
          fullName: "Closed Gate", password, persona: "CAID_ADMIN" }, { database: tx }));
        process.env.AUTH_DEV_PERSONAS_ENABLED = "true";

        const [partner] = await tx.select({ id: organizations.id }).from(organizations).where(and(
          eq(organizations.name, "Bến Cảng Logistics"), eq(organizations.organizationType, "EXTERNAL_PARTNER")));
        assert(partner, "seeded partner missing");
        await tx.update(organizations).set({ verificationStatus: "PENDING" }).where(eq(organizations.id, partner.id));
        await expectError("VALIDATION_ERROR", () => registerSelfServiceUser({
          email: `${prefix}-partial@example.test`, fullName: "Partial Failure", password,
          persona: "PARTNER", partnerOrganization: "BENCANG",
        }, { database: tx }));
        throw ROLLBACK;
      });
    } catch (error) { if (error !== ROLLBACK) throw error; }

    const after = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    assert(after[0].count === before[0].count, "user count changed after rollback");
    const residues = await db.select({ id: users.id }).from(users).where(sql`${users.email} LIKE ${`${prefix}%`}`);
    assert(residues.length === 0, "temporary users survived rollback");
    console.log("Development persona provisioning, allowlist, retry, gate, and rollback checks passed.");
  } finally {
    if (previous === undefined) delete process.env.AUTH_DEV_PERSONAS_ENABLED;
    else process.env.AUTH_DEV_PERSONAS_ENABLED = previous;
    if (previousEnvironment === undefined) delete runtimeEnvironment.NODE_ENV;
    else runtimeEnvironment.NODE_ENV = previousEnvironment;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
