import type {
  ChallengeDetail,
  ChallengeEligibilityRuleRead,
  ChallengeListItem,
  ListPublishedChallengesFilters,
} from "@/db/queries/challenges";

type ChallengeStatus = ChallengeListItem["status"];
type ChallengeVisibility = ChallengeListItem["visibility"];

export type ChallengeAccessAudience =
  | "ANONYMOUS"
  | "VINUNI_MEMBER"
  | "STUDENT"
  | "FACULTY"
  | "ORGANIZATION_MEMBER"
  | "MANAGING_UNIT_MEMBER"
  | "ADMIN";

export type ChallengeAccessId = string | number | bigint;

export type OrganizationMembershipRole =
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "CONTACT_PERSON"
  | "REVIEWER"
  | "MEMBER";

export interface ChallengeAccessOrganizationMembership {
  organizationId: ChallengeAccessId;
  roles?: OrganizationMembershipRole[];
  status?: "ACTIVE" | "INACTIVE";
}

export interface ChallengeAccessContext {
  audience: ChallengeAccessAudience;
  facultyUserId?: ChallengeAccessId;
  organizationMemberships?: ChallengeAccessOrganizationMembership[];
  userId?: ChallengeAccessId;
}

export interface ChallengeAccessSubject {
  assignedFacultyUserIds?: ChallengeAccessId[];
  confidentialityLevel?: string | null;
  managingOrganizationId?: ChallengeAccessId;
  ownerOrganizationId?: ChallengeAccessId;
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
}

export interface StudentEligibilityProfile {
  activeProjectCount?: number | null;
  availableHoursPerWeek?: number | null;
  gpa?: number | null;
  gpaScale?: number | null;
  major?: string | null;
  school?: string | null;
  studyYear?: number | null;
}

export type EligibilityRuleResult = "PASSED" | "FAILED" | "UNKNOWN";
export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "UNKNOWN";

export interface EligibilityRuleEvaluation {
  required: boolean;
  result: EligibilityRuleResult;
  reason: string;
  ruleType: ChallengeEligibilityRuleRead["ruleType"];
}

export interface EligibilityEvaluation {
  status: EligibilityStatus;
  rules: EligibilityRuleEvaluation[];
}

export const PUBLISHED_CHALLENGE_STATUSES = [
  "PUBLISHED",
  "APPLICATIONS_OPEN",
] satisfies ChallengeStatus[];

export const ORDINARY_MARKETPLACE_VISIBILITIES = [
  "PUBLIC_PREVIEW",
  "VINUNI_ONLY",
  "PRIVATE",
] satisfies ChallengeVisibility[];

export const DEFAULT_CHALLENGE_ACCESS_CONTEXT: ChallengeAccessContext = {
  audience: "VINUNI_MEMBER",
};

const ORDINARY_VINUNI_AUDIENCES = new Set<ChallengeAccessAudience>([
  "VINUNI_MEMBER",
  "STUDENT",
  "FACULTY",
  "ORGANIZATION_MEMBER",
  "MANAGING_UNIT_MEMBER",
  "ADMIN",
]);

export function isChallengePublished(status: ChallengeStatus) {
  return (PUBLISHED_CHALLENGE_STATUSES as readonly ChallengeStatus[]).includes(
    status
  );
}

export function marketplaceVisibilitiesForContext(
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): ChallengeVisibility[] {
  if (context.audience === "ANONYMOUS") return ["PUBLIC_PREVIEW"];
  return [...ORDINARY_MARKETPLACE_VISIBILITIES];
}

export function canDiscoverChallenge(
  challenge: ChallengeAccessSubject,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
) {
  if (!isChallengePublished(challenge.status)) return false;
  if (challenge.visibility === "INVITE_ONLY") return false;
  if (challenge.visibility === "PUBLIC_PREVIEW") return true;
  return ORDINARY_VINUNI_AUDIENCES.has(context.audience);
}

export function isHighConfidentialPrivateChallenge(challenge: {
  confidentialityLevel?: string | null;
  visibility: ChallengeVisibility;
}) {
  return (
    challenge.visibility === "PRIVATE" &&
    challenge.confidentialityLevel === "HIGH_CONFIDENTIALITY"
  );
}

export function canAccessOwnerOrganizationChallenge(
  challenge: Pick<ChallengeAccessSubject, "ownerOrganizationId">,
  context: ChallengeAccessContext
) {
  return hasActiveOrganizationMembership(
    context,
    challenge.ownerOrganizationId
  );
}

export function canAccessManagingOrganizationChallenge(
  challenge: Pick<ChallengeAccessSubject, "managingOrganizationId">,
  context: ChallengeAccessContext
) {
  return hasActiveOrganizationMembership(
    context,
    challenge.managingOrganizationId,
    ["ADMIN", "PROJECT_MANAGER", "REVIEWER"]
  );
}

export function canAccessAssignedFacultyChallenge(
  challenge: Pick<ChallengeAccessSubject, "assignedFacultyUserIds">,
  context: ChallengeAccessContext
) {
  if (context.audience !== "FACULTY" || context.facultyUserId === undefined) {
    return false;
  }

  const contextFacultyUserId = context.facultyUserId;

  return (challenge.assignedFacultyUserIds ?? []).some((facultyUserId) =>
    sameAccessId(facultyUserId, contextFacultyUserId)
  );
}

export function canAccessRestrictedChallengeFields(
  challenge: ChallengeAccessSubject,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
) {
  if (context.audience === "ADMIN") return true;
  if (canAccessOwnerOrganizationChallenge(challenge, context)) return true;
  if (canAccessManagingOrganizationChallenge(challenge, context)) return true;
  if (canAccessAssignedFacultyChallenge(challenge, context)) return true;
  return false;
}

export function shouldRedactOwnerOrganizationName(
  challenge: ChallengeAccessSubject,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
) {
  return (
    isHighConfidentialPrivateChallenge(challenge) &&
    !canAccessRestrictedChallengeFields(challenge, context)
  );
}

export function marketplaceVisibilityFilter(
  filters: ListPublishedChallengesFilters | undefined,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): ListPublishedChallengesFilters {
  const allowed = marketplaceVisibilitiesForContext(context);
  const requested = toArray(filters?.visibility);
  const visibility =
    requested.length === 0
      ? allowed
      : requested.filter((value) => allowed.includes(value));

  return {
    ...filters,
    visibility,
  };
}

export function applyChallengeDisclosure<T extends ChallengeListItem>(
  challenge: T,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): T {
  if (!shouldRedactOwnerOrganizationName(challenge, context)) return challenge;

  return {
    ...challenge,
    ownerOrganization: {
      ...challenge.ownerOrganization,
      displayName:
        challenge.ownerOrganization.industry ?? "Confidential organization",
      name: null,
      nameIsPublic: false,
    },
  };
}

export function applyChallengeDetailDisclosure(
  challenge: ChallengeDetail,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): ChallengeDetail {
  const redacted = applyChallengeDisclosure(challenge, context);

  if (!isHighConfidentialPrivateChallenge(redacted)) return redacted;
  if (canAccessRestrictedChallengeFields(redacted, context)) return redacted;

  return {
    ...redacted,
    contactPerson: null,
  };
}

export function evaluateChallengeEligibility(
  rules: ChallengeEligibilityRuleRead[],
  profile: StudentEligibilityProfile
): EligibilityEvaluation {
  const results = rules.map((rule) => evaluateEligibilityRule(rule, profile));
  const hasFailedRequired = results.some(
    (result) => result.required && result.result === "FAILED"
  );
  const hasUnknownRequired = results.some(
    (result) => result.required && result.result === "UNKNOWN"
  );

  return {
    rules: results,
    status: hasFailedRequired
      ? "INELIGIBLE"
      : hasUnknownRequired
        ? "UNKNOWN"
        : "ELIGIBLE",
  };
}

function evaluateEligibilityRule(
  rule: ChallengeEligibilityRuleRead,
  profile: StudentEligibilityProfile
): EligibilityRuleEvaluation {
  const required = rule.required;
  const config: Record<string, unknown> = isRecord(rule.config)
    ? rule.config
    : {};

  switch (rule.ruleType) {
    case "MIN_GPA":
      return evaluateMinGpaRule(rule.ruleType, required, config, profile);
    case "STUDY_YEAR":
      return evaluateNumberMembershipRule(
        rule.ruleType,
        required,
        config.studyYears,
        profile.studyYear,
        "study year"
      );
    case "SCHOOL":
      return evaluateStringMembershipRule(
        rule.ruleType,
        required,
        config.schools,
        profile.school,
        "school"
      );
    case "MAJOR":
      return evaluateStringMembershipRule(
        rule.ruleType,
        required,
        config.majors,
        profile.major,
        "major"
      );
    case "AVAILABLE_HOURS":
      return evaluateMinimumNumberRule(
        rule.ruleType,
        required,
        config.availableHours,
        profile.availableHoursPerWeek,
        "available hours per week"
      );
    case "MAX_ACTIVE_PROJECTS":
      return evaluateMaximumNumberRule(
        rule.ruleType,
        required,
        config.maxActiveProjects,
        profile.activeProjectCount,
        "active project count"
      );
    default:
      return unknownRule(rule.ruleType, required, "Unsupported eligibility rule.");
  }
}

function evaluateMinGpaRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  config: Record<string, unknown>,
  profile: StudentEligibilityProfile
): EligibilityRuleEvaluation {
  const minGpa = finiteNumber(config.minGpa);
  const ruleScale = finiteNumber(config.scale);
  const studentGpa = finiteNumber(profile.gpa);
  const studentScale = finiteNumber(profile.gpaScale);

  if (minGpa === null) {
    return unknownRule(ruleType, required, "MIN_GPA rule is missing minGpa.");
  }

  if (studentGpa === null) {
    return unknownRule(ruleType, required, "Student GPA is missing.");
  }

  if (ruleScale !== null) {
    if (studentScale === null) {
      return unknownRule(ruleType, required, "Student GPA scale is missing.");
    }

    if (studentScale !== ruleScale) {
      return unknownRule(
        ruleType,
        required,
        "GPA scale conversion is not defined."
      );
    }
  }

  if (studentGpa >= minGpa) {
    return passedRule(ruleType, required, `GPA ${studentGpa} meets ${minGpa}.`);
  }

  return failedRule(ruleType, required, `GPA ${studentGpa} is below ${minGpa}.`);
}

function evaluateNumberMembershipRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  allowed: unknown,
  actual: number | null | undefined,
  label: string
): EligibilityRuleEvaluation {
  const allowedNumbers = numberArray(allowed);
  const actualNumber = finiteNumber(actual);

  if (!allowedNumbers) {
    return unknownRule(ruleType, required, `${label} rule is malformed.`);
  }

  if (actualNumber === null) {
    return unknownRule(ruleType, required, `Student ${label} is missing.`);
  }

  if (allowedNumbers.includes(actualNumber)) {
    return passedRule(ruleType, required, `Student ${label} is allowed.`);
  }

  return failedRule(ruleType, required, `Student ${label} is not allowed.`);
}

function evaluateStringMembershipRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  allowed: unknown,
  actual: string | null | undefined,
  label: string
): EligibilityRuleEvaluation {
  const allowedStrings = stringArray(allowed);
  const normalizedActual = actual?.trim();

  if (!allowedStrings) {
    return unknownRule(ruleType, required, `${label} rule is malformed.`);
  }

  if (!normalizedActual) {
    return unknownRule(ruleType, required, `Student ${label} is missing.`);
  }

  if (allowedStrings.includes(normalizedActual)) {
    return passedRule(ruleType, required, `Student ${label} is allowed.`);
  }

  return failedRule(ruleType, required, `Student ${label} is not allowed.`);
}

function evaluateMinimumNumberRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  minimum: unknown,
  actual: number | null | undefined,
  label: string
): EligibilityRuleEvaluation {
  const minimumNumber = finiteNumber(minimum);
  const actualNumber = finiteNumber(actual);

  if (minimumNumber === null) {
    return unknownRule(ruleType, required, `${label} rule is malformed.`);
  }

  if (actualNumber === null) {
    return unknownRule(ruleType, required, `Student ${label} is missing.`);
  }

  if (actualNumber >= minimumNumber) {
    return passedRule(ruleType, required, `Student ${label} meets minimum.`);
  }

  return failedRule(ruleType, required, `Student ${label} is below minimum.`);
}

function evaluateMaximumNumberRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  maximum: unknown,
  actual: number | null | undefined,
  label: string
): EligibilityRuleEvaluation {
  const maximumNumber = finiteNumber(maximum);
  const actualNumber = finiteNumber(actual);

  if (maximumNumber === null) {
    return unknownRule(ruleType, required, `${label} rule is malformed.`);
  }

  if (actualNumber === null) {
    return unknownRule(ruleType, required, `Student ${label} is missing.`);
  }

  if (actualNumber <= maximumNumber) {
    return passedRule(ruleType, required, `Student ${label} meets maximum.`);
  }

  return failedRule(ruleType, required, `Student ${label} is above maximum.`);
}

function passedRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  reason: string
): EligibilityRuleEvaluation {
  return { reason, required, result: "PASSED", ruleType };
}

function failedRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  reason: string
): EligibilityRuleEvaluation {
  return { reason, required, result: "FAILED", ruleType };
}

function unknownRule(
  ruleType: ChallengeEligibilityRuleRead["ruleType"],
  required: boolean,
  reason: string
): EligibilityRuleEvaluation {
  return { reason, required, result: "UNKNOWN", ruleType };
}

function hasActiveOrganizationMembership(
  context: ChallengeAccessContext,
  organizationId: ChallengeAccessId | undefined,
  allowedRoles?: OrganizationMembershipRole[]
) {
  if (organizationId === undefined) return false;

  return (context.organizationMemberships ?? []).some((membership) => {
    if (membership.status === "INACTIVE") return false;
    if (!sameAccessId(membership.organizationId, organizationId)) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return (membership.roles ?? []).some((role) => allowedRoles.includes(role));
  });
}

function sameAccessId(left: ChallengeAccessId, right: ChallengeAccessId) {
  return left.toString() === right.toString();
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length === value.length ? strings : null;
}

function numberArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const numbers = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item)
  );
  return numbers.length === value.length ? numbers : null;
}
