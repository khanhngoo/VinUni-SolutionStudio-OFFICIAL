import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { getFacultyDashboard } from "@/services/faculty.service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function FacultyDashboardPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const facultyUserId = resolution.actor.facultyProfile?.userId;
  if (!facultyUserId) redirect("/sign-in");

  const dashboard = await getFacultyDashboard(facultyUserId);
  const { capacity, challengeAssignments, supervisedProjects, supervisionRequests } = dashboard;

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <h1>Faculty dashboard</h1>
      <p className="text-ink-2 mt-2">
        {resolution.actor.user.fullName}
        {capacity.maxActiveSupervisions !== null
          ? ` · ${supervisedProjects.length} of ${capacity.maxActiveSupervisions} supervision slots`
          : ` · ${supervisedProjects.length} active supervised project${supervisedProjects.length === 1 ? "" : "s"}`}
      </p>

      <Section title="Active supervised projects" aside="projects.faculty_supervisor_id">
        {supervisedProjects.length === 0 ? (
          <p className="text-meta text-ink-3">No projects currently supervised.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {supervisedProjects.map((project) => (
              <li key={project.applicationPublicId} className="bg-card border border-line rounded-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/workspace/${project.applicationPublicId}`} className="font-semibold text-ink hover:underline">
                    {project.challengeTitle}
                  </Link>
                  <Chip variant="ok">{project.status.replaceAll("_", " ")}</Chip>
                </div>
                <p className="text-meta text-ink-3 mt-1">
                  {project.progress.completed} of {project.progress.total} milestones completed
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Supervision requests" aside="supervision_requests · read-only">
        {supervisionRequests.length === 0 ? (
          <p className="text-meta text-ink-3">No pending supervision requests.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {supervisionRequests.map((request) => (
              <li key={request.id.toString()} className="bg-card border border-line rounded-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/faculty/${request.applicationPublicId}`} className="font-semibold text-ink hover:underline">
                    {request.challengeTitle}
                  </Link>
                  <Chip variant={request.status === "PENDING" ? "warn" : request.status === "ACCEPTED" ? "ok" : "default"}>
                    {request.status}
                  </Chip>
                </div>
                <p className="text-meta text-ink-3 mt-1">
                  {request.teamName ?? "Unnamed team"} · requested {formatDate(request.requestedAt)}
                  {request.respondBy ? ` · respond by ${formatDate(request.respondBy)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Assigned challenges" aside="challenge_faculty_assignments · not active supervision">
        {challengeAssignments.length === 0 ? (
          <p className="text-meta text-ink-3">No challenge assignments.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {challengeAssignments.map((assignment) => (
              <li key={assignment.id.toString()} className="bg-card border border-line rounded-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{assignment.challengeTitle}</p>
                  <Chip>{assignment.status}</Chip>
                  <Chip>{assignment.challengeStatus.replaceAll("_", " ")}</Chip>
                </div>
                <p className="text-meta text-ink-3 mt-1">
                  {assignment.ownerOrganizationName} · assigned {formatDate(assignment.assignedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
