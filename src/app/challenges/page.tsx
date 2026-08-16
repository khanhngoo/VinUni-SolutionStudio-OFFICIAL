import Link from "next/link";
import { Suspense } from "react";
import { ChallengeCard } from "@/components/marketplace/challenge-card";
import { FilterRail } from "@/components/marketplace/filter-rail";
import { PaginationControls } from "@/components/marketplace/pagination-controls";
import { ResultsHeader } from "@/components/marketplace/results-header";
import {
  TEMPORARY_PRE_AUTH_MARKETPLACE_CONTEXT,
  parseMarketplaceFilters,
  toMarketplaceListOptions,
  type RawMarketplaceSearchParams,
} from "@/lib/challenge-marketplace";
import { listMarketplaceChallenges } from "@/services/challenge.service";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<RawMarketplaceSearchParams>;
}) {
  const filters = parseMarketplaceFilters(await searchParams);

  return (
    <div className="flex flex-col lg:flex-row items-start">
      <FilterRail filters={filters} />
      <Suspense fallback={<MarketplaceResultsSkeleton />}>
        <MarketplaceResults filters={filters} />
      </Suspense>
    </div>
  );
}

async function MarketplaceResults({
  filters,
}: {
  filters: ReturnType<typeof parseMarketplaceFilters>;
}) {
  const results = await listMarketplaceChallenges(
    toMarketplaceListOptions(filters),
    TEMPORARY_PRE_AUTH_MARKETPLACE_CONTEXT
  );

  return (
    <div className="flex-1 min-w-0 w-full px-6 sm:px-7 py-6 pb-12">
      <ResultsHeader
        filters={filters}
        page={results.page}
        shown={results.items.length}
        total={results.total}
      />

      {results.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.items.map((challenge) => (
            <ChallengeCard key={challenge.slug} challenge={challenge} />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">
            No challenges match these filters
          </p>
          <p className="text-ink-2 mt-1.5">Try removing one, or start over.</p>
          <Link
            href="/challenges"
            className="inline-flex items-center justify-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:text-white hover:bg-brand-deep"
          >
            Clear filters
          </Link>
        </div>
      )}

      <PaginationControls
        filters={filters}
        hasNextPage={results.hasNextPage}
        hasPreviousPage={results.hasPreviousPage}
        page={results.page}
        totalPages={results.totalPages}
      />
    </div>
  );
}

function MarketplaceResultsSkeleton() {
  return (
    <div className="flex-1 min-w-0 w-full px-6 sm:px-7 py-6 pb-12">
      <div className="h-8 w-64 rounded bg-line mb-2" />
      <div className="h-4 w-44 rounded bg-line-2 mb-5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="bg-card border border-line rounded-card p-5"
          >
            <div className="h-4 w-24 rounded bg-line mb-4" />
            <div className="h-6 w-4/5 rounded bg-line-2 mb-3" />
            <div className="h-3 w-full rounded bg-line-2 mb-2" />
            <div className="h-3 w-2/3 rounded bg-line-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
