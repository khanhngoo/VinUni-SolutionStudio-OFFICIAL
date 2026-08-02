import type {
  Challenge,
  ChallengeSubType,
  College,
  Compensation,
} from "@/lib/types";
import { COLLEGES, COMPENSATIONS, SUB_TYPES } from "@/lib/types";

export type SortKey = "deadline" | "newest" | "duration";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "deadline", label: "Closing soonest" },
  { value: "newest", label: "Newest" },
  { value: "duration", label: "Shortest" },
];

export interface FilterState {
  college: College[];
  type: ChallengeSubType[];
  comp: Compensation[];
  sort: SortKey;
}

/** Next 15+ hands searchParams in as a resolved record of string | string[]. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Parse URL params into typed state, silently dropping anything unrecognised. */
export function parseFilters(params: RawSearchParams): FilterState {
  const sortRaw = asArray(params.sort)[0];

  return {
    college: asArray(params.college).filter((v): v is College =>
      (COLLEGES as string[]).includes(v),
    ),
    type: asArray(params.type).filter((v): v is ChallengeSubType =>
      (SUB_TYPES as string[]).includes(v),
    ),
    comp: asArray(params.comp).filter((v): v is Compensation =>
      (COMPENSATIONS as string[]).includes(v),
    ),
    sort: SORT_OPTIONS.some((o) => o.value === sortRaw)
      ? (sortRaw as SortKey)
      : "deadline",
  };
}

/** OR within each group, AND across groups. */
export function matchesFilters(
  challenge: Challenge,
  filters: FilterState,
): boolean {
  if (
    filters.college.length > 0 &&
    !challenge.colleges.some((c) => filters.college.includes(c))
  ) {
    return false;
  }

  if (filters.type.length > 0 && !filters.type.includes(challenge.subType)) {
    return false;
  }

  if (
    filters.comp.length > 0 &&
    !filters.comp.includes(challenge.compensation)
  ) {
    return false;
  }

  return true;
}

export function sortChallenges(
  list: Challenge[],
  sort: SortKey,
): Challenge[] {
  const sorted = [...list];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    case "duration":
      return sorted.sort((a, b) => a.durationWeeks - b.durationWeeks);
    case "deadline":
    default:
      return sorted.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }
}

export function countActive(filters: FilterState): number {
  return filters.college.length + filters.type.length + filters.comp.length;
}

/** Build a querystring for the current filters minus one value — powers the
 *  removable pills in the results header. */
export function hrefWithout(
  filters: FilterState,
  group: "college" | "type" | "comp",
  value: string,
): string {
  const next: FilterState = {
    ...filters,
    [group]: (filters[group] as string[]).filter((v) => v !== value),
  } as FilterState;
  return toHref(next);
}

export function toHref(filters: FilterState): string {
  const params = new URLSearchParams();
  filters.college.forEach((v) => params.append("college", v));
  filters.type.forEach((v) => params.append("type", v));
  filters.comp.forEach((v) => params.append("comp", v));
  if (filters.sort !== "deadline") params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `/challenges?${qs}` : "/challenges";
}
