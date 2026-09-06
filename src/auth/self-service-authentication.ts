import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { normalizeAuthenticationEmail } from "@/auth/authenticated-user";
import { db } from "@/db";
import { userCredentials, users } from "@/db/schema";

export const SELF_SERVICE_PROVIDER_ID = "self-service-credentials";
export const SELF_SERVICE_PASSWORD_ALGORITHM = "scrypt-v1";

const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const FULL_NAME_MAX_LENGTH = 255;

// A real scrypt hash used when an email is unknown so the negative path still
// performs password work. It is not attached to an account and cannot sign in.
const DUMMY_PASSWORD_HASH =
  "scrypt-v1$16384$8$1$MDEyMzQ1Njc4OWFiY2RlZg$JzhepgZ0wxFJ_qQjOdzHnHWWZgHz3c13NkHxZ2xxV4Vc3ylGl97wTOKALWXpdyfdq-rKZlMDfr6arLGBWTNyKA";

export type SelfServiceAuthenticationErrorCode =
  | "DISABLED"
  | "EMAIL_UNAVAILABLE"
  | "VALIDATION_ERROR";

export class SelfServiceAuthenticationError extends Error {
  constructor(
    public readonly code: SelfServiceAuthenticationErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "SelfServiceAuthenticationError";
  }
}

export interface SelfServiceRegistrationInput {
  email: unknown;
  fullName: unknown;
  password: unknown;
}

export interface SelfServiceAuthenticatedIdentity {
  email: string;
  fullName: string;
  userId: bigint;
}

type SelfServiceDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

interface SelfServiceAuthenticationOptions {
  database?: SelfServiceDatabase;
}

export function isSelfServiceAuthenticationEnabled(
  value = process.env.AUTH_SELF_SERVICE_ENABLED
) {
  return value?.trim().toLowerCase() === "true";
}

export async function registerSelfServiceUser(
  input: SelfServiceRegistrationInput,
  options: SelfServiceAuthenticationOptions = {}
): Promise<SelfServiceAuthenticatedIdentity> {
  if (!isSelfServiceAuthenticationEnabled()) {
    throw new SelfServiceAuthenticationError(
      "DISABLED",
      "Self-service authentication is not enabled."
    );
  }

  const normalized = validateRegistration(input);

  try {
    return options.database
      ? await insertSelfServiceUser(options.database, normalized)
      : await db.transaction((tx) => insertSelfServiceUser(tx, normalized));
  } catch (error) {
    if (error instanceof SelfServiceAuthenticationError) throw error;
    if (postgresErrorCode(error) === "23505") throw emailUnavailable();
    throw error;
  }
}

export async function authenticateSelfServiceCredentials(
  emailInput: unknown,
  passwordInput: unknown,
  options: SelfServiceAuthenticationOptions = {}
): Promise<SelfServiceAuthenticatedIdentity | null> {
  if (!isSelfServiceAuthenticationEnabled()) return null;

  const email = typeof emailInput === "string"
    ? normalizeAuthenticationEmail(emailInput)
    : null;
  const password = typeof passwordInput === "string" ? passwordInput : "";
  const passwordIsBounded =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH;

  const database = options.database ?? db;
  const row = email
    ? await database
        .select({
          email: users.email,
          fullName: users.fullName,
          passwordAlgorithm: userCredentials.passwordAlgorithm,
          passwordHash: userCredentials.passwordHash,
          status: users.status,
          userId: users.id,
        })
        .from(users)
        .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
        .where(
          and(
            sql`lower(${users.email}) = ${email}`,
            eq(users.status, "ACTIVE")
          )
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const passwordMatches = await verifyPassword(
    passwordIsBounded ? password : "invalid-password-input",
    row?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (
    !row ||
    !passwordIsBounded ||
    row.passwordAlgorithm !== SELF_SERVICE_PASSWORD_ALGORITHM ||
    !passwordMatches
  ) {
    return null;
  }

  return {
    email: row.email,
    fullName: row.fullName,
    userId: row.userId,
  };
}

async function insertSelfServiceUser(
  database: SelfServiceDatabase,
  normalized: { email: string; fullName: string; password: string }
) {
  const [existing] = await database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized.email}`)
    .limit(1);

  if (existing) throw emailUnavailable();

  const [user] = await database
    .insert(users)
    .values({
      email: normalized.email,
      fullName: normalized.fullName,
      status: "ACTIVE",
    })
    .returning({
      email: users.email,
      fullName: users.fullName,
      userId: users.id,
    });

  if (!user) {
    throw new SelfServiceAuthenticationError(
      "VALIDATION_ERROR",
      "The account could not be created."
    );
  }

  await database.insert(userCredentials).values({
    passwordAlgorithm: SELF_SERVICE_PASSWORD_ALGORITHM,
    passwordHash: await hashPassword(normalized.password),
    userId: user.userId,
  });

  return user;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, {
    blockSize: SCRYPT_BLOCK_SIZE,
    cost: SCRYPT_COST,
    parallelization: SCRYPT_PARALLELIZATION,
  });

  return [
    SELF_SERVICE_PASSWORD_ALGORITHM,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] =
    encoded.split("$");
  const cost = Number(costValue);
  const blockSize = Number(blockSizeValue);
  const parallelization = Number(parallelizationValue);

  if (
    algorithm !== SELF_SERVICE_PASSWORD_ALGORITHM ||
    cost !== SCRYPT_COST ||
    blockSize !== SCRYPT_BLOCK_SIZE ||
    parallelization !== SCRYPT_PARALLELIZATION ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return false;

    const actual = await scrypt(password, salt, {
      blockSize,
      cost,
      parallelization,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function validateRegistration(input: SelfServiceRegistrationInput) {
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string"
    ? normalizeAuthenticationEmail(input.email)
    : null;
  const password = typeof input.password === "string" ? input.password : "";
  const details: string[] = [];

  if (fullName.length < 2 || fullName.length > FULL_NAME_MAX_LENGTH) {
    details.push(`Full name must be between 2 and ${FULL_NAME_MAX_LENGTH} characters.`);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.push("Enter a valid email address.");
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    details.push(
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`
    );
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    details.push("Password must contain at least one letter and one number.");
  }

  if (details.length > 0 || !email) {
    throw new SelfServiceAuthenticationError(
      "VALIDATION_ERROR",
      "Check the highlighted account details.",
      details
    );
  }

  return { email, fullName, password };
}

function emailUnavailable() {
  return new SelfServiceAuthenticationError(
    "EMAIL_UNAVAILABLE",
    "An account cannot be created with that email address."
  );
}

function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

function scrypt(
  password: string,
  salt: Buffer,
  parameters: { blockSize: number; cost: number; parallelization: number }
) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: parameters.cost,
        maxmem: SCRYPT_MAX_MEMORY,
        p: parameters.parallelization,
        r: parameters.blockSize,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      }
    );
  });
}
