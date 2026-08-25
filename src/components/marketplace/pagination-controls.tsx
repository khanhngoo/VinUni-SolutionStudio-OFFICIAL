import Link from "next/link";
import {
  marketplaceHref,
  type MarketplaceFilterState,
} from "@/lib/challenge-marketplace";

interface PaginationControlsProps {
  filters: MarketplaceFilterState;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  totalPages: number;
}

export function PaginationControls({
  filters,
  hasNextPage,
  hasPreviousPage,
  page,
  totalPages,
}: PaginationControlsProps) {
  if (!hasPreviousPage && !hasNextPage) return null;

  return (
    <nav
      aria-label="Challenge pages"
      className="mt-6 flex items-center justify-between gap-3"
    >
      {hasPreviousPage ? (
        <Link
          href={marketplaceHref(filters, { page: page - 1 })}
          className="inline-flex items-center h-9 px-4 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="text-meta text-ink-3">
        Page {page} of {totalPages}
      </span>

      {hasNextPage ? (
        <Link
          href={marketplaceHref(filters, { page: page + 1 })}
          className="inline-flex items-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
