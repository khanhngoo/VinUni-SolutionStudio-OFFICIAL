import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  PIPELINE_LABELS,
  type PipelineBucket,
  type PipelineCard,
} from "@/lib/pipeline-columns";

/**
 * The selection pipeline as five columns.
 *
 * Cards are teams, not students — an application belongs to a team, so
 * shortlisting is a team-level act. The member count is confirmed members
 * only, since a team with two outstanding invites is not yet a team of four.
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
            <span className="text-meta text-ink-3">{bucket.cards.length}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {bucket.cards.length === 0 ? (
              <p className="text-meta text-ink-3 border border-dashed border-line rounded-card px-2.5 py-3 text-center">
                None
              </p>
            ) : (
              bucket.cards.map((card) => (
                <TeamCard key={card.applicationPublicId} card={card} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamCard({ card }: { card: PipelineCard }) {
  return (
    <Link
      href={`/partner/challenges/${card.challengeSlug}/teams/${card.applicationPublicId}`}
      className={cn(
        "group block bg-card border rounded-card px-2.5 py-2 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        card.detail?.urgent ? "border-warn" : "border-line",
      )}
    >
      <p className="font-medium text-ink text-[12px] truncate group-hover:text-brand transition-colors">
        {card.teamName}
      </p>
      <p className="text-meta text-ink-3 mt-0.5">
        {card.confirmedCount} member{card.confirmedCount === 1 ? "" : "s"}
        {card.pendingCount > 0 ? ` · ${card.pendingCount} pending` : ""}
      </p>

      {card.assessmentBand ? (
        <p className="text-meta text-ink-2 mt-1">{card.assessmentBand}</p>
      ) : null}

      {card.detail ? (
        <p
          className={cn(
            "text-meta mt-1",
            card.detail.urgent ? "text-warn font-medium" : "text-ink-3",
          )}
        >
          {card.detail.label}
        </p>
      ) : null}
    </Link>
  );
}
