import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons";
import {
  marketplaceFilterCount,
  marketplaceHrefWithout,
  type MarketplaceFilterState,
} from "@/lib/challenge-marketplace";

interface ResultsHeaderProps {
  page: number;
  shown: number;
  total: number;
  filters: MarketplaceFilterState;
}

type Group = "college" | "type" | "comp" | "search";

export function ResultsHeader({
  page,
  shown,
  total,
  filters,
}: ResultsHeaderProps) {
  const active: { group: Group; value: string }[] = [
    ...filters.college.map((value) => ({ group: "college" as const, value })),
    ...filters.type.map((value) => ({ group: "type" as const, value })),
    ...filters.comp.map((value) => ({ group: "comp" as const, value })),
    ...(filters.search
      ? [{ group: "search" as const, value: filters.search }]
      : []),
  ];

  return (
    <div className="mb-6">
      <div className="bg-brand rounded-card px-6 py-5 mb-5">
        <p className="text-[12px] text-white/70">Summer 2026 · Week 31</p>
        <h1 className="text-white mt-1">Challenge marketplace</h1>
      </div>

      <p className="text-ink-2 marker-triangle font-semibold">
        {marketplaceFilterCount(filters) > 0
          ? `${shown} shown of ${total} matching challenges`
          : `${total} open challenges`}
        {total > shown ? ` · page ${page}` : ""}
      </p>

      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {active.map(({ group, value }) => (
            <Link
              key={`${group}-${value}`}
              href={marketplaceHrefWithout(filters, group, value)}
              className="inline-flex items-center gap-1.5 rounded-card bg-brand-soft pl-2.5 pr-2 py-1 text-[11px] leading-none text-brand hover:bg-line hover:text-brand-deep"
            >
              {value}
              <CloseIcon className="w-3 h-3" />
              <span className="sr-only">Remove {value} filter</span>
            </Link>
          ))}
          <Link href="/challenges" className="text-meta text-ink-3 ml-1 underline">
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
