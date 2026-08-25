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
 * Milestone approval/close-out actions are not shown: no production mutation
 * exists yet for a partner to approve a deliverable or write close-out
 * feedback, so this is a read list, not an action queue.
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
            Your account holds more than one active external-partner
            organization membership. Switching between organizations is not
            yet supported.
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

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Projects</h1>
      <p className="text-ink-2 mt-2">{projects.length} engagement{projects.length === 1 ? "" : "s"} total.</p>

      {live.length > 0 ? (
        <Section title="Live" aside={`${live.length}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map((project) => (
              <Link
                key={project.applicationPublicId}
                href={`/workspace/${project.applicationPublicId}`}
                className="group bg-card border border-line rounded-card p-4 hover:border-brand transition-colors"
              >
                <Chip variant="ok">{project.projectStatus.replaceAll("_", " ")}</Chip>
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
                      href={`/workspace/${project.applicationPublicId}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {project.challengeTitle}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 align-middle w-[140px]">
                    <Chip>{project.projectStatus.replaceAll("_", " ")}</Chip>
                  </td>
                  <td className="py-2.5 align-middle w-[104px] text-right">
                    <Link
                      href={`/workspace/${project.applicationPublicId}`}
                      className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                    >
                      Open →
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
