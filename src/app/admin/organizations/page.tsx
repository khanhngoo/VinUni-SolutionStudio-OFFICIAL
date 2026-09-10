import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminOrganizations, type AdminOrganizationListItem } from "@/db/queries/admin";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

const ORGANIZATION_TYPES = ["INTERNAL_UNIT", "EXTERNAL_PARTNER"] as const;
const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function verificationChipVariant(status: string | null) {
  if (status === "VERIFIED") return "ok" as const;
  if (status === "REJECTED") return "warn" as const;
  return "default" as const;
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; organizationType?: string; verificationStatus?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const organizationType = ORGANIZATION_TYPES.find((value) => value === params.organizationType);
  const verificationStatus = VERIFICATION_STATUSES.find((value) => value === params.verificationStatus);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminOrganizations({ page, organizationType, verificationStatus });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Organizations</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global organization inventory"
          emptyLabel="No organizations match these filters."
          getRowKey={(row: AdminOrganizationListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Name",
              render: (row) => <span className="font-medium text-ink">{row.name}</span>,
            },
            {
              header: "Type",
              render: (row) => <Chip>{row.organizationType ?? "—"}</Chip>,
            },
            {
              header: "Verification",
              render: (row) => (
                <Chip variant={verificationChipVariant(row.verificationStatus)}>
                  {row.verificationStatus ?? "—"}
                </Chip>
              ),
            },
            {
              header: "Active memberships",
              align: "right",
              render: (row) => row.membershipCount,
            },
            {
              header: "Created",
              align: "right",
              render: (row) => formatDate(row.createdAt),
            },
          ]}
        />
      </div>

      <AdminPagination
        basePath="/admin/organizations"
        params={{ organizationType, verificationStatus }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
