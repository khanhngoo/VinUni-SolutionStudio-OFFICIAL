import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupHeading } from "@/components/partner/group-heading";
import { Chip } from "@/components/ui/chip";
import { HubApplicationTable } from "@/components/workspace/hub-application-table";
import { HUB_GROUP_LABELS } from "@/lib/workspace";
import { STAGE_LABELS } from "@/lib/types";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import {
  groupHubRows,
  hubUrgentCount,
  listWorkspaceHubRows,
} from "@/services/workspace-hub.service";

export const dynamic = "force-dynamic";

/**
 * The student's whole workload in one place. Every challenge detail page shows
 * one application's next step; this is the only screen that answers "what
 * should I be working on".
 *
 * Applications are a table rather than a card grid — a dozen of them is a list
 * you scan, not a gallery you browse — and the dates sit in a rail beside it
 * so they stop competing with the roster for vertical space.
 */
export default async function WorkspaceHubPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  const rows = await listWorkspaceHubRows(
    toApplicationActorContext(resolution.actor)
  );

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

  const buckets = groupHubRows(rows);
  const urgent = hubUrgentCount(rows);

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
                {closed.rows.map((row) => (
                  <Link
                    key={row.publicId}
                    href={`/challenges/${row.challengeSlug}`}
                    className="text-ink-3 hover:text-brand"
                  >
                    <Chip variant="outline-dashed">
                      {row.challengeTitle} · {STAGE_LABELS[row.stage]}
                    </Chip>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-6">
          <GroupHeading title="Coming up" />
          <p className="text-meta text-ink-3">
            Nothing scheduled in the next six weeks.
          </p>
        </aside>
      </div>
    </div>
  );
}
