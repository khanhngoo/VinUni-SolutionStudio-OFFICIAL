import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { listAdminAssessmentAttempts, type AdminAssessmentAttemptListItem } from "@/db/queries/admin";
import { assessmentAttemptStatus } from "@/db/schema";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { WorkflowTable } from "@/components/admin/workflow-table";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Recommended-priority workflow index (Section 8). Lists `assessment_attempts`
 * — the actual per-application workflow entity — not `assessments`, which is
 * the challenge-owned definition/template (Section 9.5's own distinction
 * between domain definitions and workflow state).
 */
export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PLATFORM_OWNER")) notFound();

  const params = await searchParams;
  const status = assessmentAttemptStatus.enumValues.find((value) => value === params.status);
  const page = Number.parseInt(params.page ?? "1", 10);

  const result = await listAdminAssessmentAttempts({ page, status });

  return (
    <div className="max-w-[1200px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Assessments</h1>
      <p className="text-ink-2 mt-2">{result.total} total</p>

      <div className="mt-5">
        <WorkflowTable
          caption="Global assessment attempt inventory"
          emptyLabel="No assessment attempts match these filters."
          getRowKey={(row: AdminAssessmentAttemptListItem) => row.id.toString()}
          rows={result.items}
          columns={[
            {
              header: "Assessment",
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.assessmentTitle ?? "Untitled assessment"}</p>
                  <p className="text-meta text-ink-3">{row.challengeTitle}</p>
                </div>
              ),
            },
            {
              header: "Status",
              render: (row) => <Chip>{row.status?.replaceAll("_", " ") ?? "—"}</Chip>,
            },
            {
              header: "Started",
              align: "right",
              render: (row) => formatDate(row.startedAt),
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
        basePath="/admin/assessments"
        params={{ status }}
        page={result.page}
        totalPages={result.totalPages}
        hasNextPage={result.hasNextPage}
        hasPreviousPage={result.hasPreviousPage}
      />
    </div>
  );
}
