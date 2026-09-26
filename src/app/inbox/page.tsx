import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { formatDateTime } from "@/lib/dates";
import { listStudentInbox, type StudentInboxEntry } from "@/services/inbox.service";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "STUDENT")) notFound();

  const entries = await listStudentInbox(resolution.actor.user.userId);
  const awaiting = entries.filter((entry) => entry.needsResponse);
  const updates = entries.filter((entry) => !entry.needsResponse);

  return (
    <div className="max-w-[900px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Inbox</h1>
      <p className="text-ink-2 mt-2">
        Invitations and updates from your applications, assessments and offers.
      </p>

      {entries.length === 0 ? (
        <div className="mt-7 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="font-semibold text-ink">Your inbox is clear</p>
          <p className="text-ink-2 mt-1.5">Team invitations and application updates will appear here.</p>
          <Link href="/challenges" className="inline-flex mt-5 font-semibold text-brand hover:text-brand-deep">
            Explore challenges →
          </Link>
        </div>
      ) : (
        <>
          {awaiting.length > 0 ? (
            <section className="mt-8" aria-labelledby="inbox-awaiting">
              <h2 id="inbox-awaiting" className="marker-triangle mb-3">
                Needs your response <span className="text-ink-3 font-medium">({awaiting.length})</span>
              </h2>
              <ul className="space-y-2.5">
                {awaiting.map((entry) => <InboxRow key={entry.id} entry={entry} />)}
              </ul>
            </section>
          ) : null}

          {updates.length > 0 ? (
            <section className="mt-8" aria-labelledby="inbox-updates">
              <h2 id="inbox-updates" className="marker-triangle mb-3">Recent updates</h2>
              <ul className="border border-line rounded-card bg-card divide-y divide-line-2">
                {updates.map((entry) => <InboxRow key={entry.id} entry={entry} />)}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

const KIND_LABEL: Record<StudentInboxEntry["kind"], string> = {
  invitation: "Team",
  application: "Application",
  assessment: "Assessment",
  offer: "Offer",
  notice: "Studio",
};

function InboxRow({ entry }: { entry: StudentInboxEntry }) {
  return (
    <li className={entry.needsResponse
      ? "rounded-card border border-brand/25 border-l-[3px] border-l-brand bg-card p-4 sm:p-5"
      : "p-4 sm:px-5 sm:py-4"}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-meta text-ink-3">
            <span className="font-semibold uppercase tracking-wide text-brand">{KIND_LABEL[entry.kind]}</span>
            {entry.at ? <time dateTime={entry.at.toISOString()}>{formatDateTime(entry.at.toISOString())}</time> : null}
          </div>
          <p className="mt-1 font-semibold text-ink">{entry.title}</p>
          {entry.body ? <p className="mt-0.5 text-ink-2">{entry.body}</p> : null}
        </div>
        {entry.href && entry.actionLabel ? (
          <Link
            href={entry.href}
            className={entry.needsResponse
              ? "inline-flex h-9 shrink-0 items-center rounded-card bg-brand px-4 font-semibold text-white hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              : "inline-flex shrink-0 items-center font-semibold text-brand hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"}
          >
            {entry.actionLabel} →
          </Link>
        ) : null}
      </div>
    </li>
  );
}
