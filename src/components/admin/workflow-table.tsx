interface WorkflowTableColumn<T> {
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

interface WorkflowTableProps<T> {
  columns: WorkflowTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  emptyLabel: string;
}

/**
 * The one generic list table every `/admin/<entity>` page renders. It shows
 * only the fields the caller passes in — callers are the enforcement point
 * for "select only approved metadata fields" (Section 13.4), not this
 * component.
 */
export function WorkflowTable<T>({ columns, rows, getRowKey, caption, emptyLabel }: WorkflowTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-line rounded-card py-10 px-6 text-center">
        <p className="text-ink-2">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line-2 rounded-card">
      <table className="w-full border-collapse min-w-[640px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-2 bg-brand-soft/40">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`py-2.5 px-3 text-meta font-semibold text-ink-2 ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-line-2 last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`py-2.5 px-3 align-middle ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
