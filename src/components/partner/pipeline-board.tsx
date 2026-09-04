import Link from "next/link";
import { cn } from "@/lib/cn";
import { countdownLabel } from "@/lib/pipeline";
import { PIPELINE_LABELS, type PipelineBucket } from "@/lib/provider";
import { confirmedMembers, pendingMembers } from "@/lib/teams";
import type { Application } from "@/lib/types";

/**
 * The selection pipeline as five columns.
 *
 * Cards are teams, not students — an application belongs to a team, so
 * shortlisting is a team-level act. Member count comes from
 * `confirmedMembers`, since a team with two outstanding invites is not yet a
 * team of four.
 */
export function PipelineBoard({ buckets }: { buckets: PipelineBucket[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {buckets.map((bucket) => (
        <div key={bucket.column} className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-h3 text-ink-3 tracking-[0.06em]">
              {PIPELINE_LABELS[bucket.column]}
            </h3>
            <span className="text-meta text-ink-3">
              {bucket.applications.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {bucket.applications.length === 0 ? (
              <p className="text-meta text-ink-3 border border-dashed border-line rounded-card px-2.5 py-3 text-center">
                None
              </p>
            ) : (
              bucket.applications.map((application) => (
                <TeamCard key={application.id} application={application} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamCard({ application }: { application: Application }) {
  const confirmed = confirmedMembers(application.team);
  const pending = pendingMembers(application.team);
  const detail = detailFor(application);

  return (
    <Link
      href={`/partner/challenges/${application.challengeId}/teams/${application.id}`}
      className={cn(
        "group block bg-card border rounded-card px-2.5 py-2 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        detail?.urgent ? "border-warn" : "border-line",
      )}
    >
      <p className="font-medium text-ink text-[12px] truncate group-hover:text-brand transition-colors">
        {application.team.name}
      </p>
      <p className="text-meta text-ink-3 mt-0.5">
        {confirmed.length} member{confirmed.length === 1 ? "" : "s"}
        {pending.length > 0 ? ` · ${pending.length} pending` : ""}
      </p>

      {application.testResult ? (
        <p className="text-meta text-ink-2 mt-1">
          {application.testResult.overallBand}
        </p>
      ) : null}

      {detail ? (
        <p
          className={cn(
            "text-meta mt-1",
            detail.urgent ? "text-warn font-medium" : "text-ink-3",
          )}
        >
          {detail.label}
        </p>
      ) : null}
    </Link>
  );
}

/**
 * The one extra fact worth a line on a card, which differs by column: an
 * invitation is a clock, an assessment is a result, everything else is quiet.
 */
function detailFor(
  application: Application,
): { label: string; urgent: boolean } | null {
  if (application.stage === "INVITED" && application.offer) {
    const left = countdownLabel(application.offer.respondBy);
    return {
      label: left === "Expired" ? "Offer expired" : `${left} to respond`,
      urgent: left === "Expired",
    };
  }

  if (application.stage === "TEST_PENDING") {
    return { label: "Assessment not started", urgent: false };
  }

  return null;
}
