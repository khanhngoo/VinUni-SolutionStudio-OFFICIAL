import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminAuditEvents, type AdminAuditEventListItem } from "@/db/queries/admin";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/services/audit.service";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

const COVERAGE_START_DATE = "2026-09-09";

function formatTimestamp(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseEntityId(value: string | undefined): bigint | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

/**
 * The filterable persistent audit history (Section 8 priority table). Reads
 * the same `listAdminAuditEvents` query as `/admin/activity` with the full
 * filter set exposed. Every filter value is validated against the actual
 * catalog/enum before reaching the query — an unrecognized value is dropped
 * rather than passed through, the same convention every other `/admin` list
 * page uses for its status filters.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entityType?: string; entityId?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const action = AUDIT_ACTIONS.find((value) => value === params.action);
  const entityType = AUDIT_ENTITY_TYPES.find((value) => value === params.entityType);
  const entityId = parseEntityId(params.entityId);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminAuditEvents({ page, action, entityType, entityId });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Audit</h1>
      <p className="text-ink-2 mt-2">{result.total} matching events</p>

      <div className="border border-dashed border-line rounded-card p-4 mt-4">
        <p className="text-meta text-ink-2">
          Coverage begins {COVERAGE_START_DATE}. This is a persistent
          application audit trail, not infrastructure telemetry — see
          Section 11.1 of the admin console plan for the distinction.
        </p>
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3 border border-line-2 rounded-card p-4">
        <label className="flex flex-col gap-1 text-meta text-ink-2">
          Action
          <select
            name="action"
            defaultValue={action ?? ""}
            className="h-9 px-2 rounded-card border border-line bg-card text-ink-2"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-meta text-ink-2">
          Entity type
          <select
            name="entityType"
            defaultValue={entityType ?? ""}
            className="h-9 px-2 rounded-card border border-line bg-card text-ink-2"
          >
            <option value="">All entity types</option>
            {AUDIT_ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-meta text-ink-2">
          Entity ID
          <input
            type="text"
            name="entityId"
            inputMode="numeric"
            defaultValue={params.entityId ?? ""}
            placeholder="e.g. 42"
            className="h-9 px-2 rounded-card border border-line bg-card text-ink-2 w-28"
          />
        </label>

        <button
          type="submit"
          className="h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Filter
        </button>
      </form>

      <div className="mt-5">
        <WorkflowTable
          caption="Filterable persistent audit history"
          emptyLabel="No audit events match these filters."
          getRowKey={(row: AdminAuditEventListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Time",
              render: (row) => <span className="text-meta text-ink-3">{formatTimestamp(row.createdAt)}</span>,
            },
            {
              header: "Action",
              render: (row) => <Chip>{row.action.replaceAll("_", " ")}</Chip>,
            },
            {
              header: "Actor",
              render: (row) => row.actorName ?? <span className="text-ink-3">System</span>,
            },
            {
              header: "Entity",
              render: (row) =>
                row.entityType ? (
                  <span className="font-mono text-meta text-ink-2">
                    {row.entityType}#{row.entityId?.toString() ?? "—"}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              header: "Details",
              render: (row) => (
                <pre className="text-meta text-ink-3 whitespace-pre-wrap max-w-[320px]">
                  {row.details ? JSON.stringify(row.details) : "—"}
                </pre>
              ),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/audit"
        params={{ action, entityType, entityId: entityId?.toString() }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
