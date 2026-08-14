import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { GroupHeading } from "@/components/partner/group-heading";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { formatDate } from "@/lib/dates";
import {
  milestoneProgress,
  orgProjects,
  partnerFeedbackOf,
  pendingApprovals,
} from "@/lib/provider";

/** Every engagement this partner is running, live ones first. */
export default function PartnerProjectsPage() {
  const projects = orgProjects();
  const approvals = pendingApprovals();

  const live = projects.filter(
    ({ application }) =>
      application.stage === "ACTIVE" || application.stage === "IN_REVIEW",
  );
  const finished = projects.filter(
    ({ application }) => application.stage === "COMPLETED",
  );

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Projects</h1>
      <p className="text-ink-2 mt-2">
        {approvals.length === 0
          ? "No deliverables are waiting on your sign-off."
          : `${approvals.length} deliverable${
              approvals.length === 1 ? "" : "s"
            } waiting on your sign-off.`}
      </p>

      {live.length > 0 ? (
        <section className="mt-7">
          <GroupHeading title="Live" count={live.length} />
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map(({ application, challenge, project }) => {
              const progress = milestoneProgress(project);
              const next = project.milestones.find(
                (m) => m.status !== "Approved",
              );
              const owes = project.milestones.some(
                (m) => m.status === "Submitted" && !m.posterApproved,
              );

              return (
                <Link
                  key={application.id}
                  href={`/partner/projects/${application.id}`}
                  className="group bg-card border border-line rounded-card p-4 hover:border-brand transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Chip variant="ok">In progress</Chip>
                    {owes ? <Chip variant="warn">Needs your sign-off</Chip> : null}
                  </div>
                  <h2 className="text-ink group-hover:text-brand transition-colors">
                    {challenge.title}
                  </h2>
                  <p className="text-meta text-ink-3 mt-1">
                    {application.team.name} · started{" "}
                    {formatDate(project.startedAt)}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <ProgressBar
                      approved={progress.approved}
                      total={progress.total}
                      className="flex-1"
                    />
                    <span className="text-meta text-ink-3 shrink-0">
                      {progress.approved}/{progress.total}
                    </span>
                  </div>

                  {next ? (
                    <p className="text-meta text-ink-3 mt-2">
                      Next: {next.title} · {formatDate(next.dueDate)}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="mt-7">
          <GroupHeading title="Finished" count={finished.length} />
          <table className="w-full border-collapse">
            <tbody>
              {finished.map(({ application, challenge, project }) => {
                const feedback = partnerFeedbackOf(project);

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
                    <td className="py-2.5 pr-3 align-middle w-[168px]">
                      {feedback ? (
                        <Chip variant="ok">Feedback given</Chip>
                      ) : (
                        <Chip variant="warn">Feedback outstanding</Chip>
                      )}
                    </td>
                    <td className="py-2.5 align-middle w-[104px] text-right">
                      <Link
                        href={
                          feedback
                            ? `/partner/projects/${application.id}`
                            : `/partner/projects/${application.id}/close`
                        }
                        className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                      >
                        {feedback ? "Open →" : "Close out →"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">No projects are running yet</p>
          <p className="text-ink-2 mt-1.5">
            A project starts when a team accepts your invitation.
          </p>
        </div>
      ) : null}
    </div>
  );
}
