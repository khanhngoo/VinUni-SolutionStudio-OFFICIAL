import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { AttentionList } from "@/components/partner/attention-list";
import { GroupHeading } from "@/components/partner/group-heading";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { currentOrganization } from "@/lib/data/organizations";
import { deadlineLabel, formatDate, isUrgent } from "@/lib/dates";
import {
  liveCount,
  milestoneProgress,
  needsAttention,
  orgChallenges,
  orgProjects,
  selectionCount,
} from "@/lib/provider";
import { cn } from "@/lib/cn";

/**
 * The partner's home.
 *
 * Deliberately the same shape as the student's `/workspace` hub: what needs
 * you, then what is running, then what is closed. A partner and a student are
 * doing the same thing from opposite ends — carrying several engagements at
 * different stages — so the screen that answers "what should I be doing" is
 * the same screen twice.
 */
export default function PartnerHomePage() {
  const org = currentOrganization();
  const challenges = orgChallenges();
  const attention = needsAttention();
  const projects = orgProjects();

  const live = projects.filter(
    ({ application }) =>
      application.stage === "ACTIVE" || application.stage === "IN_REVIEW",
  );

  const published = challenges.filter((c) => c.status === "Published");
  const drafts = challenges.filter((c) => c.status === "Draft");
  const closed = challenges.filter((c) => c.status === "Closed");

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_268px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1>Your challenges</h1>
              <p className="text-ink-2 mt-2">
                {attention.length === 0
                  ? "Nothing is waiting on you right now."
                  : `${attention.length} thing${
                      attention.length === 1 ? "" : "s"
                    } need${attention.length === 1 ? "s" : ""} your attention.`}
              </p>
            </div>
            <Link
              href="/partner/post"
              className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
            >
              + Post a challenge
            </Link>
          </div>

          {attention.length > 0 ? (
            <section className="mt-7">
              <GroupHeading title="Needs you" count={attention.length} />
              <AttentionList items={attention} />
            </section>
          ) : null}

          {live.length > 0 ? (
            <section className="mt-7">
              <GroupHeading title="Live projects" count={live.length} />
              <table className="w-full border-collapse">
                <tbody>
                  {live.map(({ application, challenge, project }) => {
                    const progress = milestoneProgress(project);
                    const next = project.milestones.find(
                      (m) => m.status !== "Approved",
                    );

                    return (
                      <tr
                        key={application.id}
                        className="border-b border-line-2 last:border-b-0"
                      >
                        <td className="py-2.5 pr-3 align-middle">
                          <Link
                            href={`/partner/projects/${application.id}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {challenge.title}
                          </Link>
                          <p className="text-meta text-ink-3 mt-0.5">
                            {application.team.name}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 align-middle w-[132px]">
                          <span className="flex items-center gap-2">
                            <ProgressBar
                              approved={progress.approved}
                              total={progress.total}
                              className="w-[58px]"
                            />
                            <span className="text-meta text-ink-3">
                              {progress.approved}/{progress.total}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 align-middle w-[104px] text-right">
                          <span className="text-meta text-ink-3 whitespace-nowrap">
                            {next ? formatDate(next.dueDate) : "—"}
                          </span>
                        </td>
                        <td className="py-2.5 align-middle w-[76px] text-right">
                          <Link
                            href={`/partner/projects/${application.id}`}
                            className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="mt-7">
            <GroupHeading title="In selection" count={published.length} />
            {published.length === 0 ? (
              <EmptyRow>Nothing is open for applications.</EmptyRow>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {published.map((challenge) => {
                    const inSelection = selectionCount(challenge.id);
                    const running = liveCount(challenge.id);

                    return (
                      <tr
                        key={challenge.id}
                        className="border-b border-line-2 last:border-b-0"
                      >
                        <td className="py-2.5 pr-3 align-middle">
                          <Link
                            href={`/partner/challenges/${challenge.id}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {challenge.title}
                          </Link>
                          <p className="text-meta text-ink-3 mt-0.5">
                            {challenge.subType} ·{" "}
                            {challenge.confidential ? "Confidential" : "Named"}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 align-middle w-[124px]">
                          <Chip>
                            {inSelection} in selection
                          </Chip>
                        </td>
                        <td className="py-2.5 pr-3 align-middle w-[110px] text-right">
                          <span
                            className={cn(
                              "text-meta whitespace-nowrap",
                              isUrgent(challenge.deadline)
                                ? "text-warn font-medium"
                                : "text-ink-3",
                            )}
                          >
                            {deadlineLabel(challenge.deadline)}
                          </span>
                        </td>
                        <td className="py-2.5 align-middle w-[76px] text-right">
                          <Link
                            href={`/partner/challenges/${challenge.id}`}
                            className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                          >
                            {running > 0 ? "Open →" : "Review →"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {drafts.length > 0 ? (
            <section className="mt-7">
              <GroupHeading title="Drafts" count={drafts.length} />
              <div className="flex flex-wrap gap-2">
                {drafts.map((challenge) => (
                  <Link key={challenge.id} href="/partner/post">
                    <Chip variant="outline-dashed">
                      {challenge.title} · Draft
                    </Chip>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {closed.length > 0 ? (
            <section className="mt-7">
              <GroupHeading title="Closed" count={closed.length} />
              <div className="flex flex-wrap gap-2">
                {closed.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/partner/challenges/${challenge.id}`}
                    className="text-ink-3 hover:text-brand"
                  >
                    <Chip variant="outline-dashed">{challenge.title}</Chip>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-6">
          <GroupHeading title="Your organisation" />
          <p className="font-semibold text-ink">{org.name}</p>
          <p className="text-meta text-ink-3 mt-0.5">{org.category}</p>
          <p className="text-ink-2 mt-3 text-[12.5px] leading-relaxed">
            {org.about}
          </p>

          <div className="mt-5 pt-4 border-t border-line">
            <h3 className="text-h3 text-ink-3">Studio contact</h3>
            <p className="text-ink font-medium mt-1.5">{org.contact.name}</p>
            <p className="text-meta text-ink-3">{org.contact.role}</p>
            <p className="text-meta text-ink-2 mt-1 break-words">
              {org.contact.email}
            </p>
          </div>

          <p className="text-meta text-ink-3 mt-5 pt-4 border-t border-line leading-relaxed">
            A CAID officer reviews every posting for compliance before it
            reaches students.
          </p>
        </aside>
      </div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line rounded-card py-8 px-6 text-center">
      <p className="text-ink-2">{children}</p>
    </div>
  );
}
