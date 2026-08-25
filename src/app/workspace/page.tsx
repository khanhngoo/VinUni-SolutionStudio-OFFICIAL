import Link from "next/link";

import { ProgressBar } from "@/components/workspace/progress-bar";
import { formatDate } from "@/lib/dates";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { redirect } from "next/navigation";
import { listWorkspaceProjects } from "@/services/workspace.service";

export const dynamic = "force-dynamic";

export default async function WorkspaceHubPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const projects = await listWorkspaceProjects(toApplicationActorContext(resolution.actor));
  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Your work</h1>
      <p className="text-ink-2 mt-2">Projects where you are currently a workspace member.</p>
      {projects.length === 0 ? (
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">No project workspace is available</p>
          <p className="text-ink-2 mt-1.5">A workspace opens only after an accepted offer creates a project.</p>
        </div>
      ) : (
        <section className="mt-7 bg-card border border-line rounded-card px-5">
          <table className="w-full border-collapse"><tbody>{projects.map((project) => (
            <tr key={project.applicationPublicId} className="border-b border-line-2 last:border-b-0">
              <td className="py-3 pr-3"><Link href={`/workspace/${project.applicationPublicId}`} className="font-medium text-ink hover:text-brand">{project.challengeTitle}</Link><p className="text-meta text-ink-3 mt-0.5">{project.projectStatus.replace("_", " ")}</p></td>
              <td className="py-3 pr-3 w-[120px]"><span className="flex items-center gap-2"><ProgressBar approved={project.progress.completed} total={project.progress.total} className="w-[58px]" /><span className="text-meta text-ink-3">{project.progress.completed}/{project.progress.total}</span></span></td>
              <td className="py-3 pr-3 w-[140px] text-right text-meta text-ink-3">{project.nextDeadline ? `Due ${formatDate(project.nextDeadline)}` : "No upcoming milestone"}</td>
              <td className="py-3 w-[70px] text-right"><Link href={`/workspace/${project.applicationPublicId}`} className="text-meta font-semibold text-brand hover:text-brand-deep">Open →</Link></td>
            </tr>
          ))}</tbody></table>
        </section>
      )}
    </div>
  );
}
