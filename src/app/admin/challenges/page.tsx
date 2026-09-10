import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminChallenges, type AdminChallengeListItem } from "@/db/queries/admin";
import { challengeStatus } from "@/db/schema";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "No deadline";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Challenge titles are intentionally plain text here, not links to
 * `/challenges/[slug]`: that route enforces the ordinary marketplace
 * visibility policy, which does not grant a platform owner access merely
 * for holding that role (Section 9.7 — no borrowed organization context).
 * Linking to a route that would 404 for an unpublished/private challenge
 * would be a dead link, so this stays a metadata-only row until a
 * dedicated admin detail view exists.
 */
export default async function AdminChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = challengeStatus.enumValues.find((value) => value === params.status);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminChallenges({ page, status });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Challenges</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global challenge lifecycle inventory"
          emptyLabel="No challenges match these filters."
          getRowKey={(row: AdminChallengeListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Title",
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.title}</p>
                  <p className="text-meta text-ink-3">
                    {row.ownerOrganizationName} → {row.managingOrganizationName}
                  </p>
                </div>
              ),
            },
            {
              header: "Status",
              render: (row) => <Chip>{row.status?.replaceAll("_", " ") ?? "—"}</Chip>,
            },
            {
              header: "Visibility",
              render: (row) => <Chip variant="outline-dashed">{row.visibility ?? "—"}</Chip>,
            },
            {
              header: "Applications",
              align: "right",
              render: (row) => row.applicationCount,
            },
            {
              header: "Deadline",
              align: "right",
              render: (row) => formatDate(row.applicationDeadline),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/challenges"
        params={{ status }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
