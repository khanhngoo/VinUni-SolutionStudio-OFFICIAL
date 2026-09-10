import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminAuditEvents, type AdminAuditEventListItem } from "@/db/queries/admin";
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

function summarizeDetails(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

/**
 * The chronological operational feed (Section 9.2). Unfiltered, newest
 * first — `/admin/audit` exposes the same underlying rows with the full
 * filter set for investigation. This page and that one intentionally read
 * the same `listAdminAuditEvents` query.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminAuditEvents({ page });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Activity</h1>
      <p className="text-ink-2 mt-2">{result.total} recorded events</p>

      <div className="border border-dashed border-line rounded-card p-4 mt-4">
        <p className="text-meta text-ink-2">
          Coverage begins {COVERAGE_START_DATE}. Events only exist for
          mutations instrumented from that date forward — the absence of an
          event here is not proof an action never happened before
          instrumentation.{" "}
          <Link href="/admin/audit" className="text-brand hover:text-brand-deep">
            Use Audit
          </Link>{" "}
          to filter by action, entity, or actor.
        </p>
      </div>

      <div className="mt-5">
        <WorkflowTable
          caption="Global operational activity feed"
          emptyLabel="No activity recorded yet."
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
                <span className="text-meta text-ink-3">{summarizeDetails(row.details) ?? "—"}</span>
              ),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/activity"
        params={{}}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
