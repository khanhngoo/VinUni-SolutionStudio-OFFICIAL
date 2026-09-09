import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { AttentionList, type AttentionItem } from "@/components/partner/attention-list";
import { Section } from "@/components/ui/section";
import { deadlineLabel, isUrgent } from "@/lib/dates";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { getPartnerDashboard, PartnerError } from "@/services/partner.service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The partner's home, rebuilt on the real EXTERNAL_PARTNER organization
 * membership resolved from PostgreSQL — never a hardcoded organization.
 *
 * Only sections that are truthfully derivable from existing production reads
 * are shown: owned challenges (any lifecycle status), applications against
 * those challenges (gated by the same owner-role predicate the Phase 5
 * application policy uses), and projects reached through the
 * project → application → challenge → owner chain (via the same
 * `listWorkspaceProjects` policy `/workspace` uses).
 */
export default async function PartnerHomePage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  // Belt-and-suspenders: PartnerLayout already gates on this capability, but
  // Server Component trees can start rendering a page before a sibling
  // layout's notFound() is observed (the same lesson D1 fixed for
  // /assessment) — so this page defends itself too, denying cleanly instead
  // of letting an unhandled PartnerError crash the request.
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  let dashboard;
  try {
    dashboard = await getPartnerDashboard(resolution.actor);
  } catch (error) {
    if (error instanceof PartnerError && error.code === "AMBIGUOUS_MEMBERSHIP") {
      return (
        <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
          <h1>Multiple partner organizations</h1>
          <p className="text-ink-2 mt-2">
            Your account is a partner representative for more than one
            organization. Ask an administrator to leave you on the one whose
            challenges you need.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { applications, canReadApplications, challenges, organization, projects } =
    dashboard;

  const live = projects.filter(
    (project) => project.projectStatus === "ACTIVE" || project.projectStatus === "PAUSED"
  );

  // What the partner personally owes someone, ahead of everything they might
  // merely want to look at. Applications waiting on a decision, deliverables
  // waiting on a signature, finished projects waiting on a closing note.
  const attention: AttentionItem[] = [
    ...applications
      .filter((application) => application.status === "SUBMITTED")
      .map((application) => ({
        challengeTitle: application.challengeTitle,
        detail: `${application.teamName ?? "A team"} applied and is waiting on a decision`,
        due: application.submittedAt ? formatDate(application.submittedAt) : null,
        href: application.challengeSlug
          ? `/partner/challenges/${application.challengeSlug}`
          : "/partner",
        kind: "shortlist",
        label: "Shortlist",
        urgent: false,
      })),
    ...live
      .filter((project) => project.progress.completed < project.progress.total)
      .map((project) => ({
        challengeTitle: project.challengeTitle,
        detail: `${project.progress.total - project.progress.completed} milestone(s) still open`,
        due: project.nextDeadline ? deadlineLabel(project.nextDeadline) : null,
        href: `/partner/projects/${project.applicationPublicId}`,
        kind: "approve",
        label: "Sign off",
        urgent: project.nextDeadline ? isUrgent(project.nextDeadline) : false,
      })),
    ...projects
      .filter((project) => project.projectStatus === "COMPLETED")
      .map((project) => ({
        challengeTitle: project.challengeTitle,
        detail: "Finished and waiting on your close-out",
        due: null,
        href: `/partner/projects/${project.applicationPublicId}/close`,
        kind: "feedback",
        label: "Close out",
        urgent: false,
      })),
  ];

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_268px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1>Your challenges</h1>
              <p className="text-ink-2 mt-2">
                {attention.length === 0
                  ? organization.name
                  : `${attention.length} thing${attention.length === 1 ? "" : "s"} need${attention.length === 1 ? "s" : ""} your attention.`}
              </p>
            </div>
            <Link
              href="/partner/post"
              className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
            >
              + Post a challenge
            </Link>
          </div>

          <Section title="Owned challenges" aside={`${challenges.length} total`}>
            {challenges.length === 0 ? (
              <EmptyRow>You have not posted any challenges yet.</EmptyRow>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {challenges.map((challenge) => (
                    <tr
                      key={challenge.publicId}
                      className="border-b border-line-2 last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 align-middle">
                        {challenge.slug ? (
                          <Link
                            href={`/partner/challenges/${challenge.slug}`}
                            className="font-medium text-ink hover:text-brand"
                          >
                            {challenge.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{challenge.title}</span>
                        )}
                        <p className="text-meta text-ink-3 mt-0.5">
                          Managed by {challenge.managingOrganizationName}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 align-middle w-[140px]">
                        <Chip>{challenge.status.replaceAll("_", " ")}</Chip>
                      </td>
                      <td className="py-2.5 pr-3 align-middle w-[120px]">
                        <Chip variant="outline-dashed">{challenge.applicantCount} applied</Chip>
                      </td>
                      <td className="py-2.5 align-middle w-[110px] text-right">
                        <span className="text-meta text-ink-3 whitespace-nowrap">
                          {challenge.applicationDeadline
                            ? formatDate(challenge.applicationDeadline)
                            : "No deadline"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {attention.length > 0 ? (
            <Section title="Needs you" aside={`${attention.length}`}>
              <AttentionList items={attention} />
            </Section>
          ) : null}

          <Section
            title="Applications"
            aside={canReadApplications ? `${applications.length} total` : undefined}
          >
            {!canReadApplications ? (
              <EmptyRow>
                Applications are visible to organization admins and the named
                contact. Ask an admin to add you.
              </EmptyRow>
            ) : applications.length === 0 ? (
              <EmptyRow>No applications yet against your challenges.</EmptyRow>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {applications.map((application) => (
                    <tr
                      key={application.publicId}
                      className="border-b border-line-2 last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 align-middle">
                        <p className="font-medium text-ink">
                          {application.teamName ?? application.memberSummary.leaderName ?? "Unnamed team"}
                        </p>
                        <p className="text-meta text-ink-3 mt-0.5">{application.challengeTitle}</p>
                      </td>
                      <td className="py-2.5 pr-3 align-middle w-[140px]">
                        <Chip>{application.status.replaceAll("_", " ")}</Chip>
                      </td>
                      <td className="py-2.5 align-middle w-[110px] text-right">
                        <span className="text-meta text-ink-3 whitespace-nowrap">
                          {application.submittedAt ? formatDate(application.submittedAt) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Projects" aside={`${projects.length} total`}>
            {projects.length === 0 ? (
              <EmptyRow>No projects have started from your challenges yet.</EmptyRow>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {projects.map((project) => (
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
                        <p className="text-meta text-ink-3 mt-0.5">
                          {project.projectStatus.replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 align-middle w-[132px]">
                        <span className="flex items-center gap-2">
                          <ProgressBar
                            approved={project.progress.completed}
                            total={project.progress.total}
                            className="w-[58px]"
                          />
                          <span className="text-meta text-ink-3">
                            {project.progress.completed}/{project.progress.total}
                          </span>
                        </span>
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
            )}
            {live.length !== projects.length ? (
              <p className="text-meta text-ink-3 mt-2.5">
                {projects.length - live.length} project
                {projects.length - live.length === 1 ? "" : "s"} completed or archived.
              </p>
            ) : null}
          </Section>
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-6">
          <Section title="Your organisation" className="mt-0">
            <p className="font-semibold text-ink">{organization.name}</p>
            {organization.industry ? (
              <p className="text-meta text-ink-3 mt-0.5">{organization.industry}</p>
            ) : null}
            {organization.description ? (
              <p className="text-ink-2 mt-3 text-[12.5px] leading-relaxed">
                {organization.description}
              </p>
            ) : null}
          </Section>

          <div className="mt-5 pt-4 border-t border-line">
            <h3 className="text-h3 text-ink-3">Signed in as</h3>
            <p className="text-ink font-medium mt-1.5">{resolution.actor.user.fullName}</p>
            <p className="text-meta text-ink-2 mt-1 break-words">{resolution.actor.user.email}</p>
          </div>
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
