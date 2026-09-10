import Link from "next/link";

interface AdminPaginationProps {
  basePath: string;
  /** Every other query param to preserve across page links (e.g. `status`). */
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function AdminPagination({
  basePath,
  params,
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
}: AdminPaginationProps) {
  if (!hasPreviousPage && !hasNextPage) return null;

  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3">
      {hasPreviousPage ? (
        <Link
          href={hrefFor(basePath, params, page - 1)}
          className="inline-flex items-center h-9 px-4 rounded-card border border-line text-brand font-semibold hover:border-brand"
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
          href={hrefFor(basePath, params, page + 1)}
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
