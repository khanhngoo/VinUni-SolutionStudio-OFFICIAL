import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { getPartnerDashboard, PartnerError } from "@/services/partner.service";

export const dynamic = "force-dynamic";

/**
 * Every engagement this partner organization is running, reached through the
 * project → application → challenge → owner chain via
 * `listWorkspaceProjects` — the same read `/workspace` uses, unmodified.
 * The list is a rollup. Sign-off happens on the project screen, next to the
 * deliverable being signed for, so this stays a way in rather than a second
 * place to act.
 */
export default async function PartnerProjectsPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  let projects;
  try {
    projects = (await getPartnerDashboard(resolution.actor)).projects;
  } catch (error) {
    if (error instanceof PartnerError && error.code === "AMBIGUOUS_MEMBERSHIP") {
      return (
        <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
          <h1>Multiple partner organizations</h1>
          <p className="text-ink-2 mt-2">
            Your account is a partner representative for more than one
            organization. Ask an administrator to leave you on the one whose
            projects you need.
          </p>
        </div>
      );
    }
    throw error;
  }

  const live = projects.filter(
    (project) => project.projectStatus === "ACTIVE" || project.projectStatus === "PAUSED"
  );
  const finished = projects.filter(
    (project) => project.projectStatus === "COMPLETED" || project.projectStatus === "ARCHIVED"
  );

  // A project whose milestones are not all complete has something outstanding;
  // it is the closest the dashboard read gets to "waiting on you" without a
  // second query per project.
  const awaitingSignoff = live.filter(
    (project) => project.progress.completed < project.progress.total
  ).length;

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Projects</h1>
      <p className="text-ink-2 mt-2">
        {awaitingSignoff === 0
          ? `${projects.length} engagement${projects.length === 1 ? "" : "s"} total.`
          : `${awaitingSignoff} deliverable${awaitingSignoff === 1 ? "" : "s"} waiting on your sign-off.`}
      </p>

      {live.length > 0 ? (
        <Section title="Live" aside={`${live.length}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map((project) => (
              <Link
                key={project.applicationPublicId}
                href={`/partner/projects/${project.applicationPublicId}`}
                className="group bg-card border border-line rounded-card p-4 hover:border-brand transition-colors"
              >
                {project.progress.completed < project.progress.total ? (
                  <Chip variant="warn">Needs your sign-off</Chip>
                ) : (
                  <Chip variant="ok">
                    {project.projectStatus.replaceAll("_", " ")}
                  </Chip>
                )}
                <h2 className="text-ink group-hover:text-brand transition-colors mt-2">
                  {project.challengeTitle}
                </h2>
                <div className="flex items-center gap-2 mt-3">
                  <ProgressBar
                    approved={project.progress.completed}
                    total={project.progress.total}
                    className="flex-1"
                  />
                  <span className="text-meta text-ink-3 shrink-0">
                    {project.progress.completed}/{project.progress.total}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {finished.length > 0 ? (
        <Section title="Finished" aside={`${finished.length}`}>
          <table className="w-full border-collapse">
            <tbody>
              {finished.map((project) => (
                <tr
                  key={project.applicationPublicId}
                  className="border-b border-line-2 last:border-b-0"
                >
                  <td className="py-2.5 pr-3 align-middle">
                    <Link
                      href={`/partner/projects/${project.applicationPublicId}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {project.challengeTitle}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 align-middle w-[140px]">
                    <Chip>{project.projectStatus.replaceAll("_", " ")}</Chip>
                  </td>
                  <td className="py-2.5 align-middle w-[150px] text-right">
                    <Link
                      href={`/partner/projects/${project.applicationPublicId}/close`}
                      className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                    >
                      Close out →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {projects.length === 0 ? (
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">No projects are running yet</p>
          <p className="text-ink-2 mt-1.5">
            A project starts when an offer is accepted for one of your challenges.
          </p>
        </div>
      ) : null}
    </div>
  );
}
