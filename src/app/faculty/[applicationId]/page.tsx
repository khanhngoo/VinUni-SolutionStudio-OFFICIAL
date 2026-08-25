import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { getFacultyApplicationDetail } from "@/services/faculty.service";
import { getApplicationByPublicId } from "@/db/queries/applications";
import { db } from "@/db";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A confirmed project supervision relationship defers to `/workspace`, the
 * authoritative production route for project state — this page only owns
 * the pre-supervision "has this faculty member been asked to supervise?"
 * relationship recorded in `supervision_requests`.
 */
export default async function FacultyApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const facultyUserId = resolution.actor.facultyProfile?.userId;
  if (!facultyUserId) redirect("/sign-in");

  const detail = await getFacultyApplicationDetail(facultyUserId, applicationId);
  if (!detail) notFound();
  if (detail.kind === "SUPERVISED_PROJECT") redirect(`/workspace/${detail.applicationPublicId}`);

  const { request } = detail;
  const application = await getApplicationByPublicId(db, applicationId);
  if (!application) notFound();

  return (
    <div className="max-w-[980px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/faculty">Faculty dashboard</Link>
        <span className="mx-1.5">›</span>
        {application.challenge.title}
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={request.status === "PENDING" ? "warn" : request.status === "ACCEPTED" ? "ok" : "default"}>
          Supervision request · {request.status}
        </Chip>
        <Chip>{application.challenge.ownerOrganization.name}</Chip>
      </div>

      <h1>{application.challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        {application.teamName ?? "Unnamed team"} · requested {formatDate(request.requestedAt)}
        {request.respondBy ? ` · respond by ${formatDate(request.respondBy)}` : ""}
      </p>

      <Section title="The team">
        <ul className="flex flex-col gap-2.5">
          {application.members.map((member) => (
            <li key={member.memberId.toString()} className="bg-card border border-line rounded-card px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{member.fullName}</p>
                <p className="text-meta text-ink-3 mt-0.5">{member.student.major ?? "Major unspecified"}</p>
              </div>
              <Chip>{member.memberRole}</Chip>
            </li>
          ))}
        </ul>
      </Section>

      {request.comments ? (
        <Section title="Comments">
          <p className="text-ink-2">{request.comments}</p>
        </Section>
      ) : null}

      <p className="text-meta text-ink-3 mt-7">
        This request is read-only. No supervision-response action is available in this build.
      </p>
    </div>
  );
}
