import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminApplications, type AdminApplicationListItem } from "@/db/queries/admin";
import { applicationStatus } from "@/db/schema";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = applicationStatus.enumValues.find((value) => value === params.status);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminApplications({ page, status });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Applications</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global application stage inventory"
          emptyLabel="No applications match these filters."
          getRowKey={(row: AdminApplicationListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Application",
              render: (row) => (
                <div>
                  <p className="font-mono text-meta text-ink-3">{row.publicId.slice(0, 8)}</p>
                  <p className="font-medium text-ink">{row.challengeTitle}</p>
                </div>
              ),
            },
            {
              header: "Status",
              render: (row) => <Chip>{row.status?.replaceAll("_", " ") ?? "—"}</Chip>,
            },
            {
              header: "Leader",
              render: (row) => row.leaderName ?? <span className="text-ink-3">—</span>,
            },
            {
              header: "Submitted",
              align: "right",
              render: (row) => formatDate(row.submittedAt),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/applications"
        params={{ status }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />

      <p className="text-meta text-ink-3 mt-4">
        <Link href="/admin/challenges" className="text-brand hover:text-brand-deep">
          View the parent challenges
        </Link>
        {" — assessment/selection/offer/project linkage state is not shown yet."}
      </p>
    </div>
  );
}
