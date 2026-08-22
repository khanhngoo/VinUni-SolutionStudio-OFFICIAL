import "dotenv/config";

import { NextRequest } from "next/server";
import { getDevelopmentIdentity, isDevelopmentAuthenticationEnabled } from "@/auth/development-identities";
import { normalizeAuthenticationEmail, resolveAuthenticatedUserByEmail } from "@/auth/authenticated-user";

async function main() {
  assert(isDevelopmentAuthenticationEnabled("development"), "development authentication should be enabled outside production");
  assert(!isDevelopmentAuthenticationEnabled("production"), "development authentication must be refused in production");
  assert(getDevelopmentIdentity("JORDAN_STUDENT_DEMO")?.email === "student.jordan-lee.demo@example.test", "Jordan development identity missing");
  assert(getDevelopmentIdentity("ARBITRARY_EMAIL") === null, "arbitrary development identities must be rejected");
  assert(normalizeAuthenticationEmail(" Jordan.Lee@EXAMPLE.TEST ") === "jordan.lee@example.test", "email normalization mismatch");

  const jordan = await resolveAuthenticatedUserByEmail("student.jordan-lee.demo@example.test");
  const bao = await resolveAuthenticatedUserByEmail("student.bao-tran.demo@example.test");
  const unknown = await resolveAuthenticatedUserByEmail("unknown@example.test");
  assert(jordan.status === "RESOLVED", "Jordan must resolve to an existing user");
  assert(bao.status === "RESOLVED", "Bao must resolve to an existing user");
  if (jordan.status === "RESOLVED" && bao.status === "RESOLVED") assert(jordan.user.userId !== bao.user.userId, "seeded identities must resolve to different users");
  assert(unknown.status === "UNMAPPED", "unknown identities must be denied, not provisioned");
  await verifyDevelopmentSessionLifecycle();
  console.log("Phase 6.1 authentication architecture verification passed.");
}

async function verifyDevelopmentSessionLifecycle() {
  process.env.AUTH_SECRET = "phase-6-1-verification-secret-not-for-deployment";
  process.env.AUTH_TRUST_HOST = "true";
  const { getProductionEntraConfigurationError, handlers } = await import("../auth");
  assert(getProductionEntraConfigurationError("production") !== null, "missing Entra configuration must fail clearly in production");

  const csrf = await handlers.GET(new NextRequest("http://localhost/api/auth/csrf"));
  assert(csrf.ok, "Auth.js CSRF endpoint must succeed");
  const csrfPayload = await csrf.json() as { csrfToken?: string };
  assert(csrfPayload.csrfToken, "Auth.js CSRF token missing");
  const csrfCookie = cookieHeader(csrf);

  const signIn = await handlers.POST(formRequest("http://localhost/api/auth/callback/development-seeded-identity", {
    csrfToken: csrfPayload.csrfToken,
    identity: "JORDAN_STUDENT_DEMO",
  }, csrfCookie));
  assert(signIn.status >= 300 && signIn.status < 400, "development sign-in must redirect");
  const sessionCookie = mergeCookies(csrfCookie, cookieHeader(signIn));

  const session = await handlers.GET(new NextRequest("http://localhost/api/auth/session", { headers: { cookie: sessionCookie } }));
  const sessionPayload = await session.json() as { user?: { email?: string } };
  assert(sessionPayload.user?.email === "student.jordan-lee.demo@example.test", "development session must identify Jordan");

  const signOutCsrf = await handlers.GET(new NextRequest("http://localhost/api/auth/csrf", { headers: { cookie: sessionCookie } }));
  const signOutPayload = await signOutCsrf.json() as { csrfToken?: string };
  assert(signOutPayload.csrfToken, "sign-out CSRF token missing");
  const signOut = await handlers.POST(formRequest("http://localhost/api/auth/signout", { csrfToken: signOutPayload.csrfToken }, mergeCookies(sessionCookie, cookieHeader(signOutCsrf))));
  assert(signOut.status >= 300 && signOut.status < 400, "sign-out must redirect");
  const signedOutSession = await handlers.GET(new NextRequest("http://localhost/api/auth/session", { headers: { cookie: mergeCookies(sessionCookie, cookieHeader(signOut)) } }));
  assert((await signedOutSession.json()) === null, "sign-out must clear the session");
}

function formRequest(url: string, values: Record<string, string>, cookie: string) {
  return new NextRequest(url, { body: new URLSearchParams(values), headers: { "content-type": "application/x-www-form-urlencoded", cookie }, method: "POST" });
}

function cookieHeader(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return (headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""])
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(...values: string[]) {
  const cookies = new Map<string, string>();
  for (const value of values) for (const cookie of value.split("; ")) {
    const [name, content] = cookie.split("=", 2);
    if (name) cookies.set(name, content ?? "");
  }
  return [...cookies].map(([name, content]) => `${name}=${content}`).join("; ");
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

main().catch((error) => { console.error(error); process.exit(1); });
