import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { AgendaRail } from "@/components/workspace/agenda-rail";
import { HubApplicationTable } from "@/components/workspace/hub-application-table";
import { getApplicationsWithChallenge } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/types";
import {
  buildAgenda,
  groupApplications,
  urgentCount,
  HUB_GROUP_LABELS,
} from "@/lib/workspace";

/**
 * The student's whole workload in one place. Every challenge detail page shows
 * one application's next step; this is the only screen that answers "what
 * should I be working on".
 *
 * Applications are a table rather than a card grid — eleven of them is a list
 * you scan, not a gallery you browse — and the dates sit in a rail beside it
 * so they stop competing with the roster for vertical space.
 */
export default function WorkspaceHubPage() {
  const rows = getApplicationsWithChallenge();

  if (rows.length === 0) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Your work</h1>
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">
            You haven&apos;t applied to anything yet
          </p>
          <p className="text-ink-2 mt-1.5">
            Applications, deadlines and meetings all show up here.
          </p>
          <Link
            href="/challenges"
            className="inline-flex items-center justify-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:text-white hover:bg-brand-deep"
          >
            Browse challenges
          </Link>
        </div>
      </div>
    );
  }

  const buckets = groupApplications(rows);
  const agenda = buildAgenda(rows, { maxEvents: 10 });
  const urgent = urgentCount(rows);

  // Closed applications are a footnote, not a table — no dates, no actions
  // worth a column, and they would otherwise be the longest group on screen.
  const open = buckets.filter((bucket) => bucket.group !== "closed");
  const closed = buckets.find((bucket) => bucket.group === "closed");

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_268px]">
        <div className="min-w-0">
          <h1>Your work</h1>
          <p className="text-ink-2 mt-2">
            {urgent === 0
              ? "Nothing is pressing right now."
              : `${urgent} thing${urgent === 1 ? "" : "s"} need${
                  urgent === 1 ? "s" : ""
                } your attention.`}
          </p>

          {open.map((bucket) => (
            <section key={bucket.group} className="mt-7">
              <GroupHeading
                title={HUB_GROUP_LABELS[bucket.group]}
                count={bucket.rows.length}
              />
              <HubApplicationTable
                rows={bucket.rows}
                showProgress={bucket.group === "in-progress"}
              />
            </section>
          ))}

          {closed ? (
            <section className="mt-7">
              <GroupHeading title="Closed" count={closed.rows.length} />
              <div className="flex flex-wrap gap-2">
                {closed.rows.map(({ application, challenge }) => (
                  <Link
                    key={application.id}
                    href={`/challenges/${challenge.id}`}
                    className="text-ink-3 hover:text-brand"
                  >
                    <Chip variant="outline-dashed">
                      {challenge.title} · {STAGE_LABELS[application.stage]}
                    </Chip>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-6">
          <GroupHeading title="Coming up" />
          <AgendaRail days={agenda} />
        </aside>
      </div>
    </div>
  );
}

/**
 * A rule rather than a boxed heading — with four groups stacked, the rules
 * read as one continuous list instead of four separate panels.
 */
function GroupHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <h2 className="text-h3 text-ink-3 normal-case tracking-[0.09em] uppercase">
        {title}
      </h2>
      {count !== undefined ? (
        <span className="text-meta text-ink-3">{count}</span>
      ) : null}
      <span aria-hidden="true" className="flex-1 h-px bg-line" />
    </div>
  );
}
