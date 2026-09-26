import { createHash, timingSafeEqual } from "node:crypto";

export const DEMO_PROVIDER_ID = "student-demo";
export const DEMO_STUDENT_EMAIL = "student.jordan-lee.demo@example.test";

const MIN_SECRET_LENGTH = 24;

export function isDemoAuthenticationEnabled(
  secret = process.env.AUTH_DEMO_PASSWORD
) {
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

export function verifyDemoPassword(
  input: unknown,
  secret = process.env.AUTH_DEMO_PASSWORD
) {
  if (typeof secret !== "string" || !isDemoAuthenticationEnabled(secret) || typeof input !== "string") {
    return false;
  }

  if (input.length > 256) return false;

  const actual = createHash("sha256").update(input).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(actual, expected);
}
