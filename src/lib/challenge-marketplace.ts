import type {
  ChallengeDetail,
  ChallengeEligibilityRuleRead,
  ChallengeListItem,
  ListPublishedChallengesOptions,
  PublishedChallengeSort,
} from "@/db/queries/challenges";
import type { ChallengeAccessContext } from "@/services/challenge-policy";

export type MarketplaceSortKey =
  | "deadline"
  | "newest"
  | "duration"
  | "start";

export type RawMarketplaceSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface MarketplaceFilterState {
  college: string[];
  comp: CompensationFilter[];
  page: number;
  search: string;
  sort: MarketplaceSortKey;
  type: string[];
}

export const TEMPORARY_PRE_AUTH_MARKETPLACE_CONTEXT: ChallengeAccessContext = {
  audience: "VINUNI_MEMBER",
};

export const MARKETPLACE_PAGE_SIZE = 12;

export const COLLEGE_OPTIONS = [
  { value: "CAS", label: "CAS · Arts & Sciences" },
  { value: "CBM", label: "CBM · Business & Management" },
  { value: "CECS", label: "CECS · Engineering & Computer Science" },
  { value: "CHS", label: "CHS · Health Sciences" },
];

export const CHALLENGE_TYPE_OPTIONS = [
  { value: "Project", label: "Project" },
  { value: "Mini-Internship", label: "Mini-Internship" },
  { value: "Research Internship", label: "Research Internship" },
];

export const COMPENSATION_OPTIONS = [
  { value: "Paid", label: "Paid" },
  { value: "Credit", label: "Credit" },
  { value: "Work-study", label: "Work-study" },
  { value: "Unpaid", label: "Unpaid" },
];

export const MARKETPLACE_SORT_OPTIONS: {
  label: string;
  value: MarketplaceSortKey;
}[] = [
  { value: "deadline", label: "Closing soonest" },
  { value: "newest", label: "Newest" },
  { value: "duration", label: "Shortest" },
  { value: "start", label: "Start date" },
];

const SORT_TO_SERVICE: Record<MarketplaceSortKey, PublishedChallengeSort> = {
  deadline: "applicationDeadline",
  duration: "durationWeeks",
  newest: "newest",
  start: "startDate",
};

const COMPENSATION_TO_SERVICE = {
  Credit: "CREDIT",
  Paid: "PAID",
  Unpaid: "UNPAID",
  "Work-study": "OTHER",
} satisfies Record<string, NonNullable<ListPublishedChallengesOptions["filters"]>["compensationType"]>;

type CompensationFilter = keyof typeof COMPENSATION_TO_SERVICE;

const VALID_COLLEGES = new Set(COLLEGE_OPTIONS.map((option) => option.value));
const VALID_TYPES = new Set(CHALLENGE_TYPE_OPTIONS.map((option) => option.value));
const VALID_COMPENSATION = new Set(
  COMPENSATION_OPTIONS.map((option) => option.value)
);
const VALID_SORTS = new Set(
  MARKETPLACE_SORT_OPTIONS.map((option) => option.value)
);

export type MarketplaceChallengeCardModel = ChallengeListItem;
export type MarketplaceChallengeDetailModel = ChallengeDetail;

export function parseMarketplaceFilters(
  params: RawMarketplaceSearchParams
): MarketplaceFilterState {
  const sort = asArray(params.sort)[0];

  return {
    college: asArray(params.college).filter((value) => VALID_COLLEGES.has(value)),
    comp: asArray(params.comp).filter(isCompensationFilter),
    page: parsePage(asArray(params.page)[0]),
    search: sanitizeSearch(asArray(params.search)[0]),
    sort: isMarketplaceSortKey(sort) ? sort : "deadline",
    type: asArray(params.type).filter((value) => VALID_TYPES.has(value)),
  };
}

export function toMarketplaceListOptions(
  filters: MarketplaceFilterState
): ListPublishedChallengesOptions {
  const compensationType = filters.comp.map(
    (value) => COMPENSATION_TO_SERVICE[value]
  );

  return {
    filters: {
      compensationType,
      school: filters.college,
      search: filters.search || undefined,
      subtype: filters.type,
    },
    page: filters.page,
    pageSize: MARKETPLACE_PAGE_SIZE,
    sort: SORT_TO_SERVICE[filters.sort],
  };
}

export function marketplaceFilterCount(filters: MarketplaceFilterState) {
  return (
    filters.college.length +
    filters.type.length +
    filters.comp.length +
    (filters.search ? 1 : 0)
  );
}

export function marketplaceHref(
  filters: MarketplaceFilterState,
  overrides: Partial<MarketplaceFilterState> = {}
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  next.college.forEach((value) => params.append("college", value));
  next.type.forEach((value) => params.append("type", value));
  next.comp.forEach((value) => params.append("comp", value));
  if (next.search) params.set("search", next.search);
  if (next.sort !== "deadline") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/challenges?${query}` : "/challenges";
}

export function marketplaceHrefWithout(
  filters: MarketplaceFilterState,
  group: "college" | "type" | "comp" | "search",
  value?: string
) {
  if (group === "search") {
    return marketplaceHref(filters, { page: 1, search: "" });
  }

  return marketplaceHref(filters, {
    [group]: filters[group].filter((item) => item !== value),
    page: 1,
  });
}

export function challengeOrganizationLabel(challenge: ChallengeListItem) {
  return challenge.ownerOrganization.displayName;
}

export function challengeIsRedacted(challenge: ChallengeListItem) {
  return !challenge.ownerOrganization.nameIsPublic;
}

export function challengeDeadlineKey(challenge: ChallengeListItem) {
  return dateKey(challenge.applicationDeadline);
}

export function challengeStartDate(challenge: ChallengeListItem) {
  return challenge.startDate ?? "TBD";
}

export function challengeWorkModeLabel(challenge: ChallengeListItem) {
  switch (challenge.workMode) {
    case "HYBRID":
      return "Hybrid";
    case "ONSITE":
      return "On-site";
    case "REMOTE":
      return "Remote";
    default:
      return "Flexible";
  }
}

export function challengeCompensationLabel(challenge: ChallengeListItem) {
  if (challenge.compensationDescription) return challenge.compensationDescription;

  switch (challenge.compensationType) {
    case "CREDIT":
      return "Credit";
    case "OTHER":
      return "Other";
    case "PAID":
      return "Paid";
    case "UNPAID":
      return "Unpaid";
    case "NOT_SPECIFIED":
    default:
      return "Not specified";
  }
}

export function challengeSizeLabel(challenge: ChallengeListItem) {
  if (challenge.teamSizeMin === null && challenge.teamSizeMax === null) return "TBD";
  if (challenge.teamSizeMin === challenge.teamSizeMax) {
    return `${challenge.teamSizeMin} student${challenge.teamSizeMin === 1 ? "" : "s"}`;
  }
  if (challenge.teamSizeMin === null) return `Up to ${challenge.teamSizeMax}`;
  if (challenge.teamSizeMax === null) return `${challenge.teamSizeMin}+ students`;
  return `${challenge.teamSizeMin}-${challenge.teamSizeMax} students`;
}

export function challengeWeeklyHoursLabel(challenge: ChallengeListItem) {
  return challenge.weeklyHours === null ? "Hours TBD" : `${challenge.weeklyHours} hrs/wk`;
}

export function challengeDurationLabel(challenge: ChallengeListItem) {
  return challenge.durationWeeks === null
    ? "Duration TBD"
    : `${challenge.durationWeeks} weeks`;
}

export function challengeDomainTags(challenge: ChallengeListItem) {
  return splitList(challenge.domain);
}

export function challengeDeliverables(challenge: ChallengeDetail) {
  return splitList(challenge.expectedDeliverables).map((line) =>
    line.replace(/^[-*]\s*/, "")
  );
}

export function challengeEligibilityLabels(challenge: ChallengeDetail) {
  if (challenge.eligibilityRules.length === 0) return ["Eligibility to be confirmed"];

  return challenge.eligibilityRules.map((rule) => formatEligibilityRule(rule));
}

export function requiredSkillCount(challenge: ChallengeListItem) {
  return challenge.skills.filter((skill) => skill.requirementType === "REQUIRED").length;
}

export function preferredSkillCount(challenge: ChallengeListItem) {
  return challenge.skills.filter((skill) => skill.requirementType === "PREFERRED").length;
}

function formatEligibilityRule(rule: ChallengeEligibilityRuleRead) {
  const config: Record<string, unknown> = isRecord(rule.config)
    ? rule.config
    : {};
  const suffix = rule.required ? "" : " (preferred)";

  switch (rule.ruleType) {
    case "MIN_GPA":
      return formatMinGpa(config, suffix);
    case "STUDY_YEAR":
      return formatListRule("Year", config.studyYears, suffix);
    case "SCHOOL":
      return formatListRule("School", config.schools, suffix);
    case "MAJOR":
      return formatListRule("Major", config.majors, suffix);
    case "AVAILABLE_HOURS":
      return typeof config.availableHours === "number"
        ? `At least ${config.availableHours} available hours/week${suffix}`
        : `Available-hours requirement${suffix}`;
    case "MAX_ACTIVE_PROJECTS":
      return typeof config.maxActiveProjects === "number"
        ? `At most ${config.maxActiveProjects} active projects${suffix}`
        : `Active-project cap${suffix}`;
    default:
      return `${rule.ruleType}${suffix}`;
  }
}

function formatMinGpa(config: Record<string, unknown>, suffix: string) {
  if (typeof config.minGpa !== "number") return `Minimum GPA requirement${suffix}`;
  if (typeof config.scale === "number") {
    return `Minimum GPA ${config.minGpa.toFixed(2)} / ${config.scale}${suffix}`;
  }
  return `Minimum GPA ${config.minGpa.toFixed(2)}${suffix}`;
}

function formatListRule(label: string, value: unknown, suffix: string) {
  if (!Array.isArray(value) || value.length === 0) {
    return `${label} requirement${suffix}`;
  }

  return `${label}: ${value.join(", ")}${suffix}`;
}

function splitList(value: string | null) {
  if (!value) return [];

  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function dateKey(value: Date | null) {
  if (!value) return "9999-12-31";
  return value.toISOString().slice(0, 10);
}

function sanitizeSearch(value: string | undefined) {
  return value?.trim().slice(0, 120) ?? "";
}

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function asArray(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMarketplaceSortKey(value: string | undefined): value is MarketplaceSortKey {
  return value !== undefined && (VALID_SORTS as ReadonlySet<string>).has(value);
}

function isCompensationFilter(value: string): value is CompensationFilter {
  return (VALID_COMPENSATION as ReadonlySet<string>).has(value);
}
