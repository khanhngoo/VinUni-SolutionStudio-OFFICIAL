import "dotenv/config";

import { count, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import {
  authenticateSelfServiceCredentials,
  hashPassword,
  isSelfServiceAuthenticationEnabled,
  registerSelfServiceUser,
  SelfServiceAuthenticationError,
  verifyPassword,
} from "@/auth/self-service-authentication";
import { resolveAuthenticatedActor } from "@/auth/authenticated-actor";
import { db } from "@/db";
import {
  facultyProfiles,
  organizationMemberships,
  studentProfiles,
  userCredentials,
  users,
} from "@/db/schema";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { listMarketplaceChallenges } from "@/services/challenge.service";

const ROLLBACK = Symbol("rollback self-service authentication verification");
const TEST_EMAIL = "self-service-verifier@example.test";
const TEST_PASSWORD = "CorrectHorse2026";

async function main() {
  const previousFlag = process.env.AUTH_SELF_SERVICE_ENABLED;
  await deleteTestAccount();
  const before = await counts();

  try {
    delete process.env.AUTH_SELF_SERVICE_ENABLED;
    assert(!isSelfServiceAuthenticationEnabled(), "self-service must default to disabled");
    await expectError(
      "DISABLED",
      () =>
        registerSelfServiceUser({
          email: TEST_EMAIL,
          fullName: "Self Service Verifier",
          password: TEST_PASSWORD,
        }),
      "disabled registration"
    );

    process.env.AUTH_SELF_SERVICE_ENABLED = "true";
    assert(isSelfServiceAuthenticationEnabled(), "explicit self-service flag must enable the provider");

    const encoded = await hashPassword(TEST_PASSWORD);
    assert(!encoded.includes(TEST_PASSWORD), "stored hash must not contain the password");
    assert(await verifyPassword(TEST_PASSWORD, encoded), "valid password hash did not verify");
    assert(!(await verifyPassword("IncorrectHorse2026", encoded)), "wrong password verified");

    try {
      await db.transaction(async (tx) => {
        const account = await registerSelfServiceUser(
          {
            email: `  ${TEST_EMAIL.toUpperCase()}  `,
            fullName: "  Self Service Verifier  ",
            password: TEST_PASSWORD,
          },
          { database: tx }
        );

        assert(account.email === TEST_EMAIL, "registration did not normalize email");
        assert(account.fullName === "Self Service Verifier", "registration did not trim name");

        const authenticated = await authenticateSelfServiceCredentials(
          TEST_EMAIL.toUpperCase(),
          TEST_PASSWORD,
          { database: tx }
        );
        assert(authenticated?.userId === account.userId, "valid credentials did not authenticate");
        assert(
          (await authenticateSelfServiceCredentials(TEST_EMAIL, "WrongPassword2026", {
            database: tx,
          })) === null,
          "invalid password authenticated"
        );

        const [credential] = await tx
          .select({ algorithm: userCredentials.passwordAlgorithm })
          .from(userCredentials)
          .where(eq(userCredentials.userId, account.userId));
        assert(credential?.algorithm === "scrypt-v1", "credential algorithm mismatch");

        const [student] = await tx
          .select({ id: studentProfiles.userId })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, account.userId));
        const [faculty] = await tx
          .select({ id: facultyProfiles.userId })
          .from(facultyProfiles)
          .where(eq(facultyProfiles.userId, account.userId));
        const [membership] = await tx
          .select({ id: organizationMemberships.id })
          .from(organizationMemberships)
          .where(eq(organizationMemberships.userId, account.userId));
        assert(!student, "self-service signup must not grant the STUDENT capability");
        assert(!faculty, "self-service signup must not grant the FACULTY capability");
        assert(!membership, "self-service signup must not grant organization authority");

        await expectError(
          "EMAIL_UNAVAILABLE",
          () =>
            registerSelfServiceUser(
              {
                email: TEST_EMAIL,
                fullName: "Duplicate Verifier",
                password: TEST_PASSWORD,
              },
              { database: tx }
            ),
          "duplicate email"
        );

        throw ROLLBACK;
      });
    } catch (error) {
      if (error !== ROLLBACK) throw error;
    }

    await verifyAuthJsSessionLifecycle();

    const after = await counts();
    assert(JSON.stringify(after) === JSON.stringify(before), "verification changed database counts");
    console.log("Self-service authentication verification passed.");
    console.log(JSON.stringify(after, null, 2));
  } finally {
    await deleteTestAccount();
    if (previousFlag === undefined) delete process.env.AUTH_SELF_SERVICE_ENABLED;
    else process.env.AUTH_SELF_SERVICE_ENABLED = previousFlag;
  }
}

async function verifyAuthJsSessionLifecycle() {
  process.env.AUTH_SECRET = "self-service-verification-secret-not-for-deployment";
  process.env.AUTH_TRUST_HOST = "true";

  const account = await registerSelfServiceUser({
    email: TEST_EMAIL,
    fullName: "Self Service Verifier",
    password: TEST_PASSWORD,
  });

  try {
    const actor = await resolveAuthenticatedActor(account);
    assert(actor.capabilities.size === 0, "self-service signup inferred a role capability");
    const marketplace = await listMarketplaceChallenges(
      {},
      marketplaceContextForActor(actor)
    );
    assert(
      marketplace.items.every((challenge) => challenge.visibility === "PUBLIC_PREVIEW"),
      "unprivileged self-service account gained non-public marketplace visibility"
    );

    const { handlers } = await import("../auth");
    const csrf = await handlers.GET(
      new NextRequest("https://solution-studio.example.test/api/auth/csrf")
    );
    assert(csrf.ok, "Auth.js CSRF endpoint must succeed");
    const payload = (await csrf.json()) as { csrfToken?: string };
    assert(payload.csrfToken, "Auth.js CSRF token missing");
    const csrfCookie = cookieHeader(csrf);

    const rejected = await handlers.POST(
      formRequest(
        "https://solution-studio.example.test/api/auth/callback/self-service-credentials",
        {
          csrfToken: payload.csrfToken,
          email: TEST_EMAIL,
          password: "WrongPassword2026",
        },
        csrfCookie
      )
    );
    assert(rejected.status >= 300 && rejected.status < 400, "wrong password must redirect");
    assert(
      !setCookies(rejected).some((cookie) =>
        cookie.startsWith("__Secure-authjs.session-token=")
      ),
      "wrong password must not create a session"
    );

    const accepted = await handlers.POST(
      formRequest(
        "https://solution-studio.example.test/api/auth/callback/self-service-credentials",
        {
          csrfToken: payload.csrfToken,
          email: TEST_EMAIL.toUpperCase(),
          password: TEST_PASSWORD,
        },
        csrfCookie
      )
    );
    assert(accepted.status >= 300 && accepted.status < 400, "valid credentials must redirect");
    const sessionCookie = mergeCookies(csrfCookie, cookieHeader(accepted));
    assert(
      setCookies(accepted).some((cookie) =>
        cookie.startsWith("__Secure-authjs.session-token=")
      ),
      "valid credentials must create a secure session"
    );

    const session = await handlers.GET(
      new NextRequest("https://solution-studio.example.test/api/auth/session", {
        headers: { cookie: sessionCookie },
      })
    );
    const sessionPayload = (await session.json()) as { user?: { email?: string } };
    assert(sessionPayload.user?.email === account.email, "session email mismatch");
  } finally {
    await db.delete(users).where(eq(users.id, account.userId));
  }
}

async function counts() {
  const [[userCount], [credentialCount]] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(userCredentials),
  ]);
  return {
    credentials: credentialCount?.total ?? 0,
    users: userCount?.total ?? 0,
  };
}

async function deleteTestAccount() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL));
}

function formRequest(
  url: string,
  values: Record<string, string>,
  cookie: string
) {
  return new NextRequest(url, {
    body: new URLSearchParams(values),
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    method: "POST",
  });
}

function cookieHeader(response: Response) {
  return setCookies(response)
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

function setCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
}

function mergeCookies(...values: string[]) {
  const cookies = new Map<string, string>();
  for (const value of values) {
    for (const cookie of value.split("; ")) {
      const [name, content] = cookie.split("=", 2);
      if (name) cookies.set(name, content ?? "");
    }
  }
  return [...cookies].map(([name, content]) => `${name}=${content}`).join("; ");
}

async function expectError(
  code: SelfServiceAuthenticationError["code"],
  action: () => Promise<unknown>,
  label: string
) {
  try {
    await action();
  } catch (error) {
    if (error instanceof SelfServiceAuthenticationError && error.code === code) return;
    throw error;
  }
  throw new Error(`${label}: expected ${code}.`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
