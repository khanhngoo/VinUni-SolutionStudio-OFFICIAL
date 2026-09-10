import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import {
  listAdminUsers,
  type AdminUserCapabilityFilter,
  type AdminUserListItem,
} from "@/db/queries/admin";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
const CAPABILITY_VALUES: AdminUserCapabilityFilter[] = [
  "STUDENT",
  "FACULTY",
  "PARTNER_REPRESENTATIVE",
  "INTERNAL_UNIT_MEMBER",
  "PLATFORM_OWNER",
];

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusChipVariant(status: string | null) {
  if (status === "ACTIVE") return "ok" as const;
  if (status === "SUSPENDED") return "warn" as const;
  return "default" as const;
}

function capabilityLabels(item: AdminUserListItem) {
  const labels: string[] = [];
  if (item.isStudent) labels.push("Student");
  if (item.isFaculty) labels.push("Faculty");
  if (item.isPartnerRepresentative) labels.push("Partner");
  if (item.isInternalUnitMember) labels.push("Internal unit");
  if (item.isPlatformOwner) labels.push("Platform owner");
  return labels;
}

/**
 * Metadata-only inventory (Section 9.3): identity, status, derived
 * capabilities, and credential presence as a boolean only — never hash or
 * algorithm details. `search` is intentionally not implemented yet; `status`
 * and `capability` are the only filters, matching what the overview links
 * to.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; capability?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = STATUS_VALUES.find((value) => value === params.status);
  const capability = CAPABILITY_VALUES.find((value) => value === params.capability);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminUsers({ page, status, capability });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Users</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global user inventory"
          emptyLabel="No users match these filters."
          getRowKey={(row: AdminUserListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Name",
              render: (row) => (
                <Link href={`/admin/users/${row.id}`} className="block hover:text-brand">
                  <p className="font-medium text-ink">{row.fullName}</p>
                  <p className="text-meta text-ink-3">{row.email}</p>
                </Link>
              ),
            },
            {
              header: "Status",
              render: (row) => <Chip variant={statusChipVariant(row.status)}>{row.status ?? "—"}</Chip>,
            },
            {
              header: "Capabilities",
              render: (row) => {
                const labels = capabilityLabels(row);
                return labels.length === 0 ? (
                  <span className="text-meta text-ink-3">Self-service only</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {labels.map((label) => (
                      <Chip key={label} variant={label === "Platform owner" ? "accent" : "default"}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                );
              },
            },
            {
              header: "Credential",
              render: (row) => (row.hasCredential ? "Yes" : "No"),
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
        basePath="/admin/users"
        params={{ status, capability }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
