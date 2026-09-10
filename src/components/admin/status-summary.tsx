import Link from "next/link";

interface StatusBreakdownRow {
  href: string;
  label: string;
  count: number;
}

interface StatusBreakdownProps {
  title: string;
  total: number;
  totalHref: string;
  rows: StatusBreakdownRow[];
  emptyLabel?: string;
}

/**
 * The overview's per-entity tile: a total (linking to the unfiltered list)
 * plus a breakdown by an actual stored enum value, each row linking to that
 * exact filtered list. Every number here is a live, definition-bearing
 * count — never an invented "health" or "quality" score (Section 9.1).
 */
export function StatusBreakdown({ title, total, totalHref, rows, emptyLabel }: StatusBreakdownProps) {
  return (
    <div className="border border-line-2 rounded-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <Link href={totalHref} className="text-meta text-brand hover:text-brand-deep font-medium">
          {total} total
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-meta text-ink-3 mt-2">{emptyLabel ?? "No records yet."}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.href} className="flex items-center justify-between gap-3 text-meta">
              <Link href={row.href} className="text-ink-2 hover:text-brand">
                {row.label.replaceAll("_", " ")}
              </Link>
              <span className="text-ink-3 tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
