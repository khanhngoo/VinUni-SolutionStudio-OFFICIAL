import {
  getAuthorizedInviteOnlyChallengeBySlug,
  getPublishedChallengeBySlug,
  listPublishedChallenges,
  type ChallengeDetail,
  type ListPublishedChallengesOptions,
  type PublishedChallengePage,
} from "@/db/queries/challenges";

import {
  DEFAULT_CHALLENGE_ACCESS_CONTEXT,
  applyChallengeDetailDisclosure,
  applyChallengeDisclosure,
  canDiscoverChallenge,
  marketplaceVisibilityFilter,
  type ChallengeAccessContext,
} from "./challenge-policy";
import { canStudentAccessInviteOnlyChallenge } from "./challenge-access.service";

export * from "./challenge-write.service";

export type MarketplaceChallengeListOptions = ListPublishedChallengesOptions;
export type MarketplaceChallengePage = PublishedChallengePage;
export type MarketplaceChallengeDetail = ChallengeDetail;

export async function listMarketplaceChallenges(
  options: MarketplaceChallengeListOptions = {},
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): Promise<MarketplaceChallengePage> {
  const filters = marketplaceVisibilityFilter(options.filters, context);

  if (hasUnmatchableVisibilityRequest(options.filters, filters)) {
    return emptyMarketplacePage(options);
  }

  const page = await listPublishedChallenges({
    ...options,
    filters,
  });

  return {
    ...page,
    items: page.items
      .filter((challenge) => canDiscoverChallenge(challenge, context))
      .map((challenge) => applyChallengeDisclosure(challenge, context)),
  };
}

export async function getMarketplaceChallengeBySlug(
  slug: string,
  context: ChallengeAccessContext = DEFAULT_CHALLENGE_ACCESS_CONTEXT
): Promise<MarketplaceChallengeDetail | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  const challenge = await getPublishedChallengeBySlug(normalizedSlug);
  if (challenge) {
    if (!canDiscoverChallenge(challenge, context)) return null;
    return applyChallengeDetailDisclosure(challenge, context);
  }

  if (
    context.audience !== "STUDENT" ||
    context.userId === undefined ||
    !(await canStudentAccessInviteOnlyChallenge(
      normalizedSlug,
      BigInt(context.userId)
    ))
  ) {
    return null;
  }

  const inviteOnlyChallenge = await getAuthorizedInviteOnlyChallengeBySlug(
    normalizedSlug
  );
  return inviteOnlyChallenge
    ? applyChallengeDetailDisclosure(inviteOnlyChallenge, context)
    : null;
}

function hasUnmatchableVisibilityRequest(
  original: ListPublishedChallengesOptions["filters"],
  normalized: ListPublishedChallengesOptions["filters"]
) {
  if (original?.visibility === undefined) return false;
  return toArray(normalized?.visibility).length === 0;
}

function emptyMarketplacePage(
  options: MarketplaceChallengeListOptions
): MarketplaceChallengePage {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);

  return {
    hasNextPage: false,
    hasPreviousPage: page > 1,
    items: [],
    page,
    pageSize,
    total: 0,
    totalPages: 0,
  };
}

function normalizePage(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value ?? 1));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(50, Math.max(1, Math.floor(value ?? 12)));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
