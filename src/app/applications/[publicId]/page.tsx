import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import {
  ApplicationError,
  getApplicationDetail,
  toApplicationActorContext,
} from "@/services/application.service";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * One application, read live from PostgreSQL — the full detail
 * `getApplicationDetail` already returns (team, motivation, assessment/offer/
 * project summaries) but nothing rendered before this page. Deliberately a
 * single shared route rather than separate student/partner/internal-unit
 * pages: `canAccessApplicationDetail` already authorizes exactly those three
 * audiences (application member, owner-organization role, managing-
 * organization role), so this page needs no new authorization logic — it
 * just presents whatever the actor is already allowed to see. An actor with
 * none of those three relationships gets the same `notFound()` as a
 * nonexistent application; no existence/ownership metadata leaks.
 */
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");

  const actor = toApplicationActorContext(resolution.actor);

  let application;
  try {
    application = await getApplicationDetail(publicId, actor);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") notFound();
    throw error;
  }
  if (!application) notFound();

  const { challenge, members, offerSummary, projectSummary } = application;

  return (
    <div className="max-w-[880px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href={`/challenges/${challenge.slug}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Application
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <Chip>{application.status.replaceAll("_", " ")}</Chip>
          </div>
          <h1>{application.teamName ?? challenge.title}</h1>
          <p className="text-ink-2 mt-2">
            {challenge.ownerOrganizationName} · Managed by {challenge.managingOrganizationName}
          </p>
        </div>

        {projectSummary ? (
          <Link
            href={`/workspace/${application.publicId}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Go to project workspace
          </Link>
        ) : offerSummary ? (
          <Link
            href={`/offer/${application.publicId}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            View offer
          </Link>
        ) : null}
      </div>

      <Section title="Team">
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.email}
              className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-medium text-ink">
                  {member.fullName}{" "}
                  <span className="text-meta text-ink-3 font-normal">
                    · {member.memberRole === "LEADER" ? "Leader" : "Member"}
                  </span>
                </p>
                <p className="text-meta text-ink-3 mt-0.5">
                  {member.email}
                  {member.student.school ? ` · ${member.student.school}` : ""}
                  {member.student.major ? ` · ${member.student.major}` : ""}
                </p>
              </div>
              <Chip variant={member.status === "ACCEPTED" ? "ok" : undefined}>
                {member.status}
              </Chip>
            </li>
          ))}
        </ul>
      </Section>

      {application.motivation || application.relevantExperience ? (
        <Section title="Application content">
          {application.motivation ? (
            <div className="bg-card border border-line rounded-card p-5">
              <h3 className="text-h3 text-ink-3">Motivation</h3>
              <p className="text-ink-2 mt-2 leading-relaxed">{application.motivation}</p>
            </div>
          ) : null}
          {application.relevantExperience ? (
            <div className="bg-card border border-line rounded-card p-5 mt-3">
              <h3 className="text-h3 text-ink-3">Relevant experience</h3>
              <p className="text-ink-2 mt-2 leading-relaxed">{application.relevantExperience}</p>
            </div>
          ) : null}
        </Section>
      ) : null}

      {application.assessmentSummaries.length > 0 ? (
        <Section title="Assessments">
          <ul className="flex flex-col gap-2">
            {application.assessmentSummaries.map((assessment, index) => (
              <li
                key={index}
                className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-ink">{assessment.assessmentTitle ?? "Assessment"}</p>
                  <p className="text-meta text-ink-3 mt-0.5">
                    {assessment.overallBand ?? "No result yet"}
                    {assessment.submittedAt ? ` · Submitted ${formatDate(assessment.submittedAt)}` : ""}
                  </p>
                </div>
                <Chip>{assessment.attemptStatus.replaceAll("_", " ")}</Chip>
              </li>
            ))}
          </ul>
          <Link
            href={`/assessment/${application.publicId}`}
            className="inline-block mt-3 text-meta font-semibold text-brand hover:text-brand-deep"
          >
            View assessment →
          </Link>
        </Section>
      ) : null}

      {offerSummary ? (
        <Section title="Offer">
          <div className="bg-card border border-line rounded-card p-5">
            <p className="font-medium text-ink">{offerSummary.offerStatus?.replaceAll("_", " ") ?? "—"}</p>
            <p className="text-meta text-ink-3 mt-1">
              {offerSummary.hoursPerWeek ?? "—"} hrs/wk · {offerSummary.durationWeeks ?? "—"} wks
              {offerSummary.startDate ? ` · Starts ${offerSummary.startDate}` : ""}
            </p>
            <Link
              href={`/offer/${application.publicId}`}
              className="inline-block mt-3 text-meta font-semibold text-brand hover:text-brand-deep"
            >
              View offer →
            </Link>
          </div>
        </Section>
      ) : null}

      {application.supervisionRequests.length > 0 ? (
        <Section title="Faculty supervision">
          <ul className="flex flex-col gap-2">
            {application.supervisionRequests.map((request, index) => (
              <li
                key={index}
                className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-ink">
                  {request.faculty.fullName}
                  {request.faculty.department ? ` · ${request.faculty.department}` : ""}
                </p>
                <Chip>{request.status.replaceAll("_", " ")}</Chip>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
