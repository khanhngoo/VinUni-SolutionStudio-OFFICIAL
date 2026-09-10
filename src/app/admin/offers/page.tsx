import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminOffers, type AdminOfferListItem } from "@/db/queries/admin";
import { offerStatus } from "@/db/schema";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(row: AdminOfferListItem) {
  return row.status === "PENDING" && row.respondBy !== null && row.respondBy.getTime() < Date.now();
}

/** Recommended-priority workflow index (Section 8). */
export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = offerStatus.enumValues.find((value) => value === params.status);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminOffers({ page, status });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Offers</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global offer inventory"
          emptyLabel="No offers match these filters."
          getRowKey={(row: AdminOfferListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Challenge",
              render: (row) => <span className="font-medium text-ink">{row.challengeTitle}</span>,
            },
            {
              header: "Status",
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <Chip variant={row.status === "ACCEPTED" ? "ok" : undefined}>
                    {row.status?.replaceAll("_", " ") ?? "—"}
                  </Chip>
                  {isOverdue(row) ? <Chip variant="warn">Overdue</Chip> : null}
                </div>
              ),
            },
            {
              header: "Respond by",
              align: "right",
              render: (row) => formatDate(row.respondBy),
            },
            {
              header: "Created",
              align: "right",
              render: (row) => formatDate(row.createdAt),
            },
            {
              header: "Responded",
              align: "right",
              render: (row) => formatDate(row.respondedAt),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/offers"
        params={{ status }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
