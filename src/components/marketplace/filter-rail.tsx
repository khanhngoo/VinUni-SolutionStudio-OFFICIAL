import Link from "next/link";
import { FilterAutoSubmit } from "@/components/marketplace/filter-auto-submit";
import { FilterGroup } from "@/components/marketplace/filter-group";
import { Chip } from "@/components/ui/chip";
import {
  CHALLENGE_TYPE_OPTIONS,
  COLLEGE_OPTIONS,
  COMPENSATION_OPTIONS,
  MARKETPLACE_SORT_OPTIONS,
  type MarketplaceFilterState,
} from "@/lib/challenge-marketplace";

interface FilterRailProps {
  filters: MarketplaceFilterState;
}

export function FilterRail({ filters }: FilterRailProps) {
  return (
    <form
      method="GET"
      action="/challenges"
      className="lg:w-[236px] lg:shrink-0 lg:border-r border-line bg-card lg:self-stretch px-5 py-6"
    >
      <FilterAutoSubmit />

      <div className="flex items-baseline justify-between mb-4">
        <h2 className="marker-triangle text-brand">Filters</h2>
        <Link href="/challenges" className="text-meta text-ink-3">
          Reset
        </Link>
      </div>

      <div className="mb-5">
        <h3 className="mb-2.5">Search</h3>
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Search challenges"
          className="w-full h-8 px-2.5 rounded-card border border-line bg-card text-meta text-ink-2 placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <FilterGroup
        label="College fit"
        name="college"
        selected={filters.college}
        options={COLLEGE_OPTIONS}
      />

      <FilterGroup
        label="Challenge type"
        name="type"
        selected={filters.type}
        options={CHALLENGE_TYPE_OPTIONS}
      />

      <FilterGroup
        label="Compensation"
        name="comp"
        selected={filters.comp}
        options={COMPENSATION_OPTIONS}
      />

      <div className="mb-5">
        <h3 className="mb-2.5">Sort by</h3>
        <select
          name="sort"
          defaultValue={filters.sort}
          className="w-full h-8 px-2 rounded-card border border-line bg-card text-meta text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {MARKETPLACE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-4 border-t border-line-2">
        <div className="flex items-center gap-2 mb-3">
          <h3>Not yet wired</h3>
          <Chip variant="outline-dashed">Coming soon</Chip>
        </div>
        <FilterGroup
          label="Work mode"
          name="mode"
          selected={[]}
          disabled
          options={[
            { value: "ONSITE", label: "On-site" },
            { value: "HYBRID", label: "Hybrid" },
            { value: "REMOTE", label: "Remote" },
          ]}
        />
        <label className="flex items-start gap-2.5 text-ink-3 cursor-not-allowed">
          <input
            type="checkbox"
            disabled
            className="w-[15px] h-[15px] mt-0.5 rounded-[4px] border-[1.5px] border-line shrink-0"
          />
          Only show challenges I&apos;m eligible for
        </label>
      </div>

      <button
        type="submit"
        className="mt-5 w-full h-9 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
      >
        Apply filters
      </button>
    </form>
  );
}
