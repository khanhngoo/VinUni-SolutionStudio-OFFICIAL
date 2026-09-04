/**
 * A rule rather than a boxed heading — the same treatment the student hub
 * uses, so stacked groups read as one continuous list instead of several
 * separate panels.
 */
export function GroupHeading({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <h2 className="text-h3 text-ink-3 normal-case tracking-[0.09em] uppercase">
        {title}
      </h2>
      {count !== undefined ? (
        <span className="text-meta text-ink-3">{count}</span>
      ) : null}
      <span aria-hidden="true" className="flex-1 h-px bg-line" />
    </div>
  );
}
