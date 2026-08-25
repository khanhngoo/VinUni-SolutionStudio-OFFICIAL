import { db } from "@/db";
import {
  getChallengeWriteActorByEmail,
  getChallengeWriteOrganizationById,
  getChallengeWriteSubjectById,
  getChallengeWriteSubjectBySlug,
  insertChallenge,
  insertChallengeReview,
  replaceChallengeEligibilityRules,
  replaceChallengeFacultyAssignments,
  replaceChallengeSkills,
  selectFacultyProfilesByUserIds,
  selectSkillsByCanonicalNames,
  slugExists,
  updateChallengeContent,
  updateChallengeStatus,
  type ChallengeEligibilityRuleInsert,
  type ChallengeFacultyAssignmentInsert,
  type ChallengeMutationDatabase,
  type ChallengeSkillInsert,
  type ChallengeStatus,
  type ChallengeVisibility,
  type ChallengeWriteActorMembership,
  type ChallengeWriteActorRecord,
  type ChallengeWriteSubject,
  type CompensationType,
  type EligibilityRuleType,
  type ReviewDecision,
  type SkillRequirementType,
  type WorkMode,
} from "@/db/mutations/challenges";

export type ChallengeWriteErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class ChallengeWriteError extends Error {
  constructor(
    public readonly code: ChallengeWriteErrorCode,
    message: string,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = "ChallengeWriteError";
  }
}

export type DevelopmentChallengeActorKey =
  | "BENCANG_CONTACT_DEMO"
  | "CAID_ADMIN_DEMO"
  | "ELAB_ADMIN_DEMO";

export interface ChallengeWriteActorContext {
  email: string;
  fullName: string;
  memberships: ChallengeWriteActorMembership[];
  source: "DEVELOPMENT_ONLY" | "AUTHENTICATED";
  userId: bigint;
}

export interface ChallengeSkillWriteInput {
  canonicalName: string;
  requirementType: SkillRequirementType;
  weight?: number;
}

export interface ChallengeEligibilityRuleWriteInput {
  config: Record<string, unknown>;
  required?: boolean;
  ruleType: EligibilityRuleType;
}

export interface ChallengeContentWriteInput {
  applicationDeadline?: Date | null;
  compensationDescription?: string | null;
  compensationType?: CompensationType;
  confidentialityLevel?: string | null;
  description: string;
  domain?: string | null;
  durationWeeks?: number | null;
  expectedDeliverables?: string | null;
  startDate?: string | null;
  subtype?: string | null;
  summary: string;
  teamSizeMax?: number | null;
  teamSizeMin?: number | null;
  title: string;
  visibility?: ChallengeVisibility;
  weeklyHours?: number | null;
  workMode?: WorkMode | null;
}

export interface CreateChallengeDraftInput extends ChallengeContentWriteInput {
  contactPersonId?: bigint | null;
  eligibilityRules?: ChallengeEligibilityRuleWriteInput[];
  managingOrganizationId: bigint;
  ownerOrganizationId: bigint;
  skills?: ChallengeSkillWriteInput[];
  slug?: string;
}

export interface UpdateChallengeDraftInput
  extends Partial<ChallengeContentWriteInput> {
  eligibilityRules?: ChallengeEligibilityRuleWriteInput[];
  skills?: ChallengeSkillWriteInput[];
}

export interface ChallengeReviewInput {
  comments?: string | null;
  decision: ReviewDecision;
}

export interface ChallengeFacultyAssignmentWriteInput {
  comments?: string | null;
  facultyUserId: bigint;
}

export interface ChallengeWriteResult {
  publicId?: string;
  slug: string;
  status: ChallengeStatus;
}

interface ChallengeWriteOptions {
  database?: ChallengeMutationDatabase;
}

const DEVELOPMENT_ACTOR_EMAILS: Record<DevelopmentChallengeActorKey, string> = {
  BENCANG_CONTACT_DEMO: "contact.bencang.demo@example.test",
  CAID_ADMIN_DEMO: "caid.admin.dev@example.test",
  ELAB_ADMIN_DEMO: "elab.admin.dev@example.test",
};

const OWNER_WRITE_ROLES = new Set(["ADMIN", "CONTACT_PERSON"]);
const MANAGING_WRITE_ROLES = new Set(["ADMIN", "PROJECT_MANAGER", "REVIEWER"]);
const EDITABLE_STATUSES = ["DRAFT", "REVISION_REQUESTED"] satisfies ChallengeStatus[];
const SUBMITTABLE_STATUSES = ["DRAFT", "REVISION_REQUESTED"] satisfies ChallengeStatus[];
const REVIEWABLE_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] satisfies ChallengeStatus[];
const PUBLISHABLE_STATUSES = ["APPROVED"] satisfies ChallengeStatus[];

export async function getDevelopmentChallengeWriteActor(
  key: DevelopmentChallengeActorKey,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteActorContext> {
  const actor = await getChallengeWriteActorByEmail(
    options.database ?? db,
    DEVELOPMENT_ACTOR_EMAILS[key]
  );

  if (!actor) {
    throw new ChallengeWriteError(
      "NOT_FOUND",
      `Development actor ${key} was not found in the local seed.`
    );
  }

  return toActorContext(actor, "DEVELOPMENT_ONLY");
}

export async function createChallengeDraft(
  input: CreateChallengeDraftInput,
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const normalized = normalizeChallengeContent(input);
    const validation = [
      ...validateChallengeContent(normalized),
      ...validateCreateOwnership(input, actor),
    ];
    if (validation.length > 0) validationError(validation);

    const [ownerOrganization, managingOrganization] = await Promise.all([
      getChallengeWriteOrganizationById(tx, input.ownerOrganizationId),
      getChallengeWriteOrganizationById(tx, input.managingOrganizationId),
    ]);

    if (!ownerOrganization) throw notFound("Owner organization was not found.");
    if (!managingOrganization) {
      throw notFound("Managing organization was not found.");
    }
    if (managingOrganization.organizationType !== "INTERNAL_UNIT") {
      validationError(["Managing organization must be a VinUni internal unit."]);
    }

    const slug = input.slug ? normalizeSlug(input.slug) : slugify(input.title);
    if (!slug) validationError(["Challenge slug could not be generated."]);
    if (await slugExists(tx, slug)) {
      throw new ChallengeWriteError(
        "CONFLICT",
        `Challenge slug '${slug}' already exists.`
      );
    }

    const [skills, eligibilityRules] = await Promise.all([
      resolveSkillInputs(tx, input.skills ?? []),
      validateEligibilityRules(input.eligibilityRules ?? []),
    ]);

    const challenge = await insertChallenge(tx, {
      ...normalized,
      compensationType: normalized.compensationType ?? "NOT_SPECIFIED",
      contactPersonId: input.contactPersonId ?? actor.userId,
      managingOrganizationId: input.managingOrganizationId,
      ownerOrganizationId: input.ownerOrganizationId,
      slug,
      status: "DRAFT",
      visibility: normalized.visibility ?? "VINUNI_ONLY",
    });

    await replaceChallengeSkills(tx, challenge.id, skills);
    await replaceChallengeEligibilityRules(tx, challenge.id, eligibilityRules);

    return {
      publicId: challenge.publicId,
      slug: challenge.slug ?? slug,
      status: challenge.status ?? "DRAFT",
    };
  });
}

export async function updateChallengeDraft(
  slug: string,
  input: UpdateChallengeDraftInput,
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const challenge = await requireChallenge(tx, slug);
    assertOwnerCanWrite(challenge, actor);
    assertStatus(challenge, EDITABLE_STATUSES, "update");

    const normalized = normalizePartialChallengeContent(input);
    const validation = validatePartialChallengeContent(normalized);
    if (validation.length > 0) validationError(validation);

    // Resolve every replacement payload before changing either normalized child
    // collection. This keeps a caller-owned transaction safe even when it
    // handles a validation error and continues with other work.
    const skills =
      input.skills === undefined ? undefined : await resolveSkillInputs(tx, input.skills);
    const eligibilityRules =
      input.eligibilityRules === undefined
        ? undefined
        : await validateEligibilityRules(input.eligibilityRules);

    if (skills !== undefined) {
      await replaceChallengeSkills(tx, challenge.id, skills);
    }

    if (eligibilityRules !== undefined) {
      await replaceChallengeEligibilityRules(tx, challenge.id, eligibilityRules);
    }

    const updated =
      Object.keys(normalized).length > 0
        ? await updateChallengeContent(tx, challenge.id, normalized)
        : await getChallengeWriteSubjectById(tx, challenge.id);

    if (!updated) throw notFound("Challenge disappeared during update.");

    return {
      slug: updated.slug ?? slug,
      status: updated.status ?? challenge.status,
    };
  });
}

export async function submitChallengeForReview(
  slug: string,
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const challenge = await requireChallenge(tx, slug);
    assertOwnerCanWrite(challenge, actor);

    const updated = await updateChallengeStatus(
      tx,
      challenge.id,
      [...SUBMITTABLE_STATUSES],
      "SUBMITTED"
    );
    if (!updated) invalidTransition(challenge, "submit for review", SUBMITTABLE_STATUSES);

    return {
      slug: updated.slug ?? slug,
      status: updated.status ?? "SUBMITTED",
    };
  });
}

export async function recordChallengeReviewDecision(
  slug: string,
  input: ChallengeReviewInput,
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const challenge = await requireChallenge(tx, slug);
    const reviewerOrganizationId = assertManagingCanWrite(challenge, actor);
    const nextStatus = reviewDecisionStatus(input.decision);

    const updated = await updateChallengeStatus(
      tx,
      challenge.id,
      [...REVIEWABLE_STATUSES],
      nextStatus
    );
    if (!updated) invalidTransition(challenge, "review", REVIEWABLE_STATUSES);

    await insertChallengeReview(tx, {
      challengeId: challenge.id,
      comments: input.comments ?? null,
      decision: input.decision,
      reviewerId: actor.userId,
      reviewerOrganizationId,
    });

    return {
      slug: updated.slug ?? slug,
      status: updated.status ?? nextStatus,
    };
  });
}

export async function publishApprovedChallenge(
  slug: string,
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const challenge = await requireChallenge(tx, slug);
    assertManagingCanWrite(challenge, actor);

    const updated = await updateChallengeStatus(
      tx,
      challenge.id,
      [...PUBLISHABLE_STATUSES],
      "APPLICATIONS_OPEN"
    );
    if (!updated) invalidTransition(challenge, "publish", PUBLISHABLE_STATUSES);

    return {
      slug: updated.slug ?? slug,
      status: updated.status ?? "APPLICATIONS_OPEN",
    };
  });
}

export async function replaceChallengeFacultyRouting(
  slug: string,
  assignments: ChallengeFacultyAssignmentWriteInput[],
  actor: ChallengeWriteActorContext,
  options: ChallengeWriteOptions = {}
): Promise<ChallengeWriteResult> {
  return withChallengeWriteTransaction(options.database ?? db, async (tx) => {
    const challenge = await requireChallenge(tx, slug);
    assertManagingCanWrite(challenge, actor);

    const facultyIds = assignments.map((assignment) => assignment.facultyUserId);
    assertNoDuplicateBigints(facultyIds, "faculty routing assignments");

    const faculty = await selectFacultyProfilesByUserIds(tx, facultyIds);
    const foundFaculty = new Set(faculty.map((row) => row.userId.toString()));
    const missing = facultyIds.filter((id) => !foundFaculty.has(id.toString()));
    if (missing.length > 0) {
      validationError(["Every assigned faculty user must have a faculty profile."]);
    }

    const rows: ChallengeFacultyAssignmentInsert[] = assignments.map((assignment) => ({
      comments: assignment.comments ?? null,
      facultyId: assignment.facultyUserId,
      status: "PENDING",
    }));

    await replaceChallengeFacultyAssignments(tx, challenge.id, actor.userId, rows);

    return {
      slug: challenge.slug ?? slug,
      status: challenge.status,
    };
  });
}

function toActorContext(
  actor: ChallengeWriteActorRecord,
  source: ChallengeWriteActorContext["source"]
): ChallengeWriteActorContext {
  return {
    email: actor.email,
    fullName: actor.fullName,
    memberships: actor.memberships,
    source,
    userId: actor.userId,
  };
}

async function withChallengeWriteTransaction<T>(
  database: ChallengeMutationDatabase,
  callback: (tx: ChallengeMutationDatabase) => Promise<T>
) {
  if (!isTransaction(database)) {
    return database.transaction((tx) => callback(tx));
  }

  return callback(database);
}

function isTransaction(
  database: ChallengeMutationDatabase
): database is Parameters<Parameters<typeof db.transaction>[0]>[0] {
  return "rollback" in database && typeof database.rollback === "function";
}

async function requireChallenge(
  database: ChallengeMutationDatabase,
  slug: string
) {
  const challenge = await getChallengeWriteSubjectBySlug(database, slug.trim());
  if (!challenge) throw notFound("Challenge was not found.");
  return challenge;
}

function assertOwnerCanWrite(
  challenge: Pick<ChallengeWriteSubject, "ownerOrganizationId">,
  actor: ChallengeWriteActorContext
) {
  if (!hasActiveMembership(actor, challenge.ownerOrganizationId, OWNER_WRITE_ROLES)) {
    throw new ChallengeWriteError(
      "FORBIDDEN",
      "Actor cannot write challenges for this owner organization."
    );
  }
}

function assertManagingCanWrite(
  challenge: Pick<ChallengeWriteSubject, "managingOrganizationId">,
  actor: ChallengeWriteActorContext
) {
  const membership = actor.memberships.find(
    (item) =>
      item.status === "ACTIVE" &&
      sameId(item.organizationId, challenge.managingOrganizationId) &&
      MANAGING_WRITE_ROLES.has(item.role)
  );

  if (!membership) {
    throw new ChallengeWriteError(
      "FORBIDDEN",
      "Actor cannot manage this challenge's managing organization scope."
    );
  }

  return membership.organizationId;
}

function hasActiveMembership(
  actor: ChallengeWriteActorContext,
  organizationId: bigint,
  allowedRoles: Set<string>
) {
  return actor.memberships.some(
    (item) =>
      item.status === "ACTIVE" &&
      sameId(item.organizationId, organizationId) &&
      allowedRoles.has(item.role)
  );
}

function assertStatus(
  challenge: Pick<ChallengeWriteSubject, "status">,
  allowed: readonly ChallengeStatus[],
  action: string
) {
  if (!allowed.includes(challenge.status)) {
    invalidTransition(challenge, action, allowed);
  }
}

function invalidTransition(
  challenge: Pick<ChallengeWriteSubject, "status">,
  action: string,
  allowed: readonly ChallengeStatus[]
): never {
  throw new ChallengeWriteError(
    "INVALID_TRANSITION",
    `Cannot ${action} challenge from ${challenge.status}.`,
    [`Allowed source statuses: ${allowed.join(", ")}`]
  );
}

function reviewDecisionStatus(decision: ReviewDecision): ChallengeStatus {
  switch (decision) {
    case "APPROVED":
      return "APPROVED";
    case "REVISION_REQUESTED":
      return "REVISION_REQUESTED";
    case "REJECTED":
      return "CANCELLED";
  }
}

function validateCreateOwnership(
  input: CreateChallengeDraftInput,
  actor: ChallengeWriteActorContext
) {
  const errors: string[] = [];

  if (!hasActiveMembership(actor, input.ownerOrganizationId, OWNER_WRITE_ROLES)) {
    errors.push("Actor must be an active owner-organization contact/admin.");
  }

  if (input.contactPersonId !== undefined && input.contactPersonId !== null) {
    if (!sameId(input.contactPersonId, actor.userId)) {
      errors.push("Temporary Phase 4.4 contact person must be the actor.");
    }
  }

  return errors;
}

function normalizeChallengeContent(input: ChallengeContentWriteInput) {
  return {
    applicationDeadline: input.applicationDeadline ?? null,
    compensationDescription: cleanOptional(input.compensationDescription),
    compensationType: input.compensationType,
    confidentialityLevel: cleanOptional(input.confidentialityLevel),
    description: input.description.trim(),
    domain: cleanOptional(input.domain),
    durationWeeks: input.durationWeeks ?? null,
    expectedDeliverables: cleanOptional(input.expectedDeliverables),
    startDate: input.startDate ?? null,
    subtype: cleanOptional(input.subtype),
    summary: input.summary.trim(),
    teamSizeMax: input.teamSizeMax ?? null,
    teamSizeMin: input.teamSizeMin ?? null,
    title: input.title.trim(),
    visibility: input.visibility,
    weeklyHours: input.weeklyHours ?? null,
    workMode: input.workMode ?? null,
  };
}

function normalizePartialChallengeContent(input: UpdateChallengeDraftInput) {
  const normalized: Record<string, unknown> = {};

  if (input.applicationDeadline !== undefined) {
    normalized.applicationDeadline = input.applicationDeadline;
  }
  if (input.compensationDescription !== undefined) {
    normalized.compensationDescription = cleanOptional(input.compensationDescription);
  }
  if (input.compensationType !== undefined) normalized.compensationType = input.compensationType;
  if (input.confidentialityLevel !== undefined) {
    normalized.confidentialityLevel = cleanOptional(input.confidentialityLevel);
  }
  if (input.description !== undefined) normalized.description = input.description.trim();
  if (input.domain !== undefined) normalized.domain = cleanOptional(input.domain);
  if (input.durationWeeks !== undefined) normalized.durationWeeks = input.durationWeeks;
  if (input.expectedDeliverables !== undefined) {
    normalized.expectedDeliverables = cleanOptional(input.expectedDeliverables);
  }
  if (input.startDate !== undefined) normalized.startDate = input.startDate;
  if (input.subtype !== undefined) normalized.subtype = cleanOptional(input.subtype);
  if (input.summary !== undefined) normalized.summary = input.summary.trim();
  if (input.teamSizeMax !== undefined) normalized.teamSizeMax = input.teamSizeMax;
  if (input.teamSizeMin !== undefined) normalized.teamSizeMin = input.teamSizeMin;
  if (input.title !== undefined) normalized.title = input.title.trim();
  if (input.visibility !== undefined) normalized.visibility = input.visibility;
  if (input.weeklyHours !== undefined) normalized.weeklyHours = input.weeklyHours;
  if (input.workMode !== undefined) normalized.workMode = input.workMode;

  return normalized;
}

function validateChallengeContent(
  input: ReturnType<typeof normalizeChallengeContent>
) {
  const errors = validatePartialChallengeContent(input);
  if (!input.title) errors.push("Title is required.");
  if (!input.summary) errors.push("Summary is required.");
  if (!input.description) errors.push("Description is required.");
  return errors;
}

function validatePartialChallengeContent(input: Record<string, unknown>) {
  const errors: string[] = [];

  if (typeof input.title === "string" && input.title.length === 0) {
    errors.push("Title cannot be blank.");
  }
  if (typeof input.summary === "string" && input.summary.length === 0) {
    errors.push("Summary cannot be blank.");
  }
  if (typeof input.description === "string" && input.description.length === 0) {
    errors.push("Description cannot be blank.");
  }
  validatePositiveInteger(input.durationWeeks, "durationWeeks", errors);
  validatePositiveInteger(input.weeklyHours, "weeklyHours", errors);
  validatePositiveInteger(input.teamSizeMin, "teamSizeMin", errors);
  validatePositiveInteger(input.teamSizeMax, "teamSizeMax", errors);

  if (
    typeof input.teamSizeMin === "number" &&
    typeof input.teamSizeMax === "number" &&
    input.teamSizeMax < input.teamSizeMin
  ) {
    errors.push("teamSizeMax must be greater than or equal to teamSizeMin.");
  }

  if (typeof input.startDate === "string" && !isDateOnly(input.startDate)) {
    errors.push("startDate must use YYYY-MM-DD date semantics.");
  }

  if (
    input.applicationDeadline instanceof Date &&
    typeof input.startDate === "string" &&
    isDateOnly(input.startDate) &&
    dateOnlyKey(input.applicationDeadline) > input.startDate
  ) {
    errors.push("applicationDeadline must be on or before startDate.");
  }

  return errors;
}

function validatePositiveInteger(
  value: unknown,
  label: string,
  errors: string[]
) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    errors.push(`${label} must be a positive integer.`);
  }
}

async function resolveSkillInputs(
  database: ChallengeMutationDatabase,
  inputs: ChallengeSkillWriteInput[]
): Promise<ChallengeSkillInsert[]> {
  const normalizedNames = inputs.map((input) => normalizeSkillName(input.canonicalName));
  assertNoDuplicateStrings(normalizedNames, "challenge skills");

  const invalidWeights = inputs.filter(
    (input) =>
      input.weight !== undefined &&
      (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > 1)
  );
  if (invalidWeights.length > 0) {
    validationError(["Skill weight must be between 0 and 1."]);
  }

  const rows = await selectSkillsByCanonicalNames(database, normalizedNames);
  const byName = new Map(
    rows.map((row) => [normalizeSkillName(row.canonicalName), row])
  );
  const missing = normalizedNames.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    validationError([`Unknown canonical skill(s): ${missing.join(", ")}.`]);
  }

  return inputs.map((input) => ({
    requirementType: input.requirementType,
    skillId: byName.get(normalizeSkillName(input.canonicalName))!.id,
    weight: input.weight,
  }));
}

async function validateEligibilityRules(
  inputs: ChallengeEligibilityRuleWriteInput[]
): Promise<ChallengeEligibilityRuleInsert[]> {
  return inputs.map((input) => ({
    config: validateEligibilityConfig(input.ruleType, input.config),
    required: input.required ?? true,
    ruleType: input.ruleType,
  }));
}

function validateEligibilityConfig(
  ruleType: EligibilityRuleType,
  config: Record<string, unknown>
) {
  switch (ruleType) {
    case "MIN_GPA": {
      const minGpa = numberValue(config.minGpa);
      const scale = optionalNumberValue(config.scale);
      if (minGpa === null || minGpa < 0) {
        validationError(["MIN_GPA requires non-negative numeric minGpa."]);
      }
      if (scale !== null && scale <= 0) {
        validationError(["MIN_GPA scale must be positive when supplied."]);
      }
      if (scale !== null && minGpa > scale) {
        validationError(["MIN_GPA minGpa cannot exceed scale."]);
      }
      return scale === null ? { minGpa } : { minGpa, scale };
    }
    case "STUDY_YEAR":
      return { studyYears: positiveIntegerArray(config.studyYears, "studyYears") };
    case "SCHOOL":
      return { schools: nonEmptyStringArray(config.schools, "schools") };
    case "MAJOR":
      return { majors: nonEmptyStringArray(config.majors, "majors") };
    case "AVAILABLE_HOURS": {
      const availableHours = numberValue(config.availableHours);
      if (availableHours === null || availableHours <= 0) {
        validationError(["AVAILABLE_HOURS requires positive availableHours."]);
      }
      return { availableHours };
    }
    case "MAX_ACTIVE_PROJECTS": {
      const maxActiveProjects = numberValue(config.maxActiveProjects);
      if (
        maxActiveProjects === null ||
        !Number.isInteger(maxActiveProjects) ||
        maxActiveProjects < 0
      ) {
        validationError([
          "MAX_ACTIVE_PROJECTS requires non-negative integer maxActiveProjects.",
        ]);
      }
      return { maxActiveProjects };
    }
  }
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalNumberValue(value: unknown) {
  if (value === undefined || value === null) return null;
  return numberValue(value);
}

function positiveIntegerArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0) {
    validationError([`${label} must be a non-empty array.`]);
  }
  const normalized = value.map((item) => Number(item));
  if (normalized.some((item) => !Number.isInteger(item) || item <= 0)) {
    validationError([`${label} must contain positive integers only.`]);
  }
  return Array.from(new Set(normalized));
}

function nonEmptyStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length === 0) {
    validationError([`${label} must be a non-empty array.`]);
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  if (normalized.length !== value.length || normalized.length === 0) {
    validationError([`${label} must contain non-empty strings only.`]);
  }
  return Array.from(new Set(normalized));
}

function assertNoDuplicateStrings(values: string[], label: string) {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    validationError([`Duplicate ${label} are not allowed.`]);
  }
}

function assertNoDuplicateBigints(values: bigint[], label: string) {
  const unique = new Set(values.map((value) => value.toString()));
  if (unique.size !== values.length) {
    validationError([`Duplicate ${label} are not allowed.`]);
  }
}

function validationError(details: string[]): never {
  throw new ChallengeWriteError("VALIDATION_ERROR", "Challenge write validation failed.", details);
}

function notFound(message: string): ChallengeWriteError {
  return new ChallengeWriteError("NOT_FOUND", message);
}

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function slugify(value: string) {
  return normalizeSlug(value);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function normalizeSkillName(value: string) {
  return value.trim().toLowerCase();
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateOnlyKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sameId(a: bigint, b: bigint) {
  return a.toString() === b.toString();
}
