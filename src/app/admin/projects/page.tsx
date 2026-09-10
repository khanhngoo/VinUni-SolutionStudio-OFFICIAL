import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminProjects, type AdminProjectListItem } from "@/db/queries/admin";
import { projectStatus } from "@/db/schema";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = projectStatus.enumValues.find((value) => value === params.status);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminProjects({ page, status });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Projects</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global active-project inventory"
          emptyLabel="No projects match these filters."
          getRowKey={(row: AdminProjectListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Project",
              render: (row) => <span className="font-medium text-ink">{row.challengeTitle}</span>,
            },
            {
              header: "Status",
              render: (row) => <Chip>{row.status?.replaceAll("_", " ") ?? "—"}</Chip>,
            },
            {
              header: "Faculty supervisor",
              render: (row) => row.facultySupervisorName ?? <span className="text-ink-3">Unassigned</span>,
            },
            {
              header: "Members",
              align: "right",
              render: (row) => row.memberCount,
            },
            {
              header: "Milestones",
              align: "right",
              render: (row) => `${row.milestonesCompleted}/${row.milestonesTotal}`,
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/projects"
        params={{ status }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
