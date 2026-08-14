import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { CloseOutForm } from "@/components/partner/close-out-form";
import { formatDate } from "@/lib/dates";
import { getOrgApplicationById, orgApplications } from "@/lib/provider";
import { getChallengeById } from "@/lib/queries";
import { confirmedMembers } from "@/lib/teams";

export function generateStaticParams() {
  return orgApplications()
    .filter((a) => a.stage === "COMPLETED" && a.project !== null)
    .map((a) => ({ applicationId: a.id }));
}

/**
 * Close-out. Runs once every milestone is approved and the application has
 * reached COMPLETED.
 */
export default async function PartnerCloseOutPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getOrgApplicationById(applicationId);
  if (!application?.project) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const project = application.project;
  const members = confirmedMembers(application.team);
  const weeks = challenge.durationWeeks;

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner/projects">Projects</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/partner/projects/${application.id}`}>
          {challenge.title}
        </Link>
        <span className="mx-1.5">›</span>
        Close out
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant="ok">All {project.milestones.length} milestones approved</Chip>
      </div>

      <h1>Close out with {application.team.name}</h1>
      <p className="text-ink-2 mt-2">
        {challenge.title} · {weeks} weeks · finished{" "}
        {formatDate(application.stageEnteredAt)}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {members.map((member) => (
          <Chip key={member.studentId}>
            {member.name} · {member.role}
          </Chip>
        ))}
      </div>

      <CloseOutForm
        teamName={application.team.name}
        memberNames={members.map((m) => m.name)}
        applicationId={application.id}
      />
    </div>
  );
}
