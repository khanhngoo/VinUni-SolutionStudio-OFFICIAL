import Link from "next/link";
import { Section } from "@/components/ui/section";
import { AgendaList } from "@/components/workspace/agenda-list";
import { HubApplicationCard } from "@/components/workspace/hub-application-card";
import { HubTodoList } from "@/components/workspace/hub-todo-list";
import { getApplicationsWithChallenge } from "@/lib/queries";
import {
  buildAgenda,
  buildTodos,
  groupApplications,
  todosThisWeek,
  HUB_GROUP_BLURB,
  HUB_GROUP_LABELS,
} from "@/lib/workspace";

/**
 * The student's whole workload in one place. Every challenge detail page shows
 * one application's next step; this is the only screen that answers "what
 * should I be working on".
 */
export default function WorkspaceHubPage() {
  const rows = getApplicationsWithChallenge();

  if (rows.length === 0) {
    return (
      <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
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

  const todos = buildTodos(rows);
  const buckets = groupApplications(rows);
  const agenda = buildAgenda(rows);
  const thisWeek = todosThisWeek(todos).length;

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Your work</h1>
      <p className="text-ink-2 mt-2">
        {thisWeek === 0
          ? "Nothing needs you this week."
          : `${thisWeek} thing${thisWeek === 1 ? "" : "s"} need${
              thisWeek === 1 ? "s" : ""
            } you this week.`}
      </p>

      <Section title="Do next">
        <HubTodoList todos={todos} />
      </Section>

      {buckets.map((bucket) => (
        <Section
          key={bucket.group}
          title={HUB_GROUP_LABELS[bucket.group]}
          aside={HUB_GROUP_BLURB[bucket.group]}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {bucket.rows.map((row) => (
              <HubApplicationCard
                key={row.application.id}
                application={row.application}
                challenge={row.challenge}
              />
            ))}
          </div>
        </Section>
      ))}

      <Section title="Coming up" aside="Next six weeks">
        <AgendaList days={agenda} />
      </Section>
    </div>
  );
}
