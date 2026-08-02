import Link from "next/link";
import { ChallengeCard } from "@/components/marketplace/challenge-card";
import { FilterRail } from "@/components/marketplace/filter-rail";
import { ResultsHeader } from "@/components/marketplace/results-header";
import { parseFilters, type RawSearchParams } from "@/lib/filters";
import { getChallenges, totalChallengeCount } from "@/lib/queries";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  const results = getChallenges(filters);

  return (
    <div className="flex flex-col lg:flex-row items-start">
      <FilterRail filters={filters} />

      <div className="flex-1 min-w-0 w-full px-6 sm:px-7 py-6 pb-12">
        <ResultsHeader
          shown={results.length}
          total={totalChallengeCount()}
          filters={filters}
        />

        {results.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-line rounded-card py-16 px-6 text-center">
            <p className="text-ink font-semibold">
              No challenges match these filters
            </p>
            <p className="text-ink-2 mt-1.5">
              Try removing one, or start over.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center justify-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:text-white hover:bg-brand-deep"
            >
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
