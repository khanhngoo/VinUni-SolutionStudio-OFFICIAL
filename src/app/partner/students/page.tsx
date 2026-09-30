import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { StudentCard } from "@/components/partner/student-card";
import { Chip } from "@/components/ui/chip";
import { db } from "@/db";
import type { PartnerChallengeDetailRead } from "@/db/queries/partner";
import { applicationDeadlineCampusDate } from "@/lib/dates";
import { listDirectoryStudents } from "@/db/queries/students";
import { toCollege, toDirectoryStudent } from "@/lib/apply-view";
import { recommendationsFor } from "@/lib/recommendations";
import type { Challenge } from "@/lib/types";
import {
  getPartnerChallengePage,
  getPartnerDashboard,
} from "@/services/partner.service";

export const dynamic = "force-dynamic";

/**
 * Sourcing, not triage.
 *
 * This deck runs over the whole student directory, independent of who has
 * applied — a partner reaching out to people who have not found the posting
 * yet. The applicant pipeline lives on the challenge page; the two are
 * deliberately separate surfaces because they answer different questions.
 */
export default async function PartnerStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  const params = await searchParams;
  const dashboard = await getPartnerDashboard(resolution.actor);
  if (!dashboard) notFound();

  const open = dashboard.challenges.filter(
    (challenge) => challenge.status === "APPLICATIONS_OPEN"
  );

  const requested = typeof params.challenge === "string" ? params.challenge : null;
  const selected = open.find((c) => c.slug === requested) ?? open[0];

  if (!selected) {
    return (
      <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <h1>Find students</h1>
        <div className="mt-6 border border-dashed border-line rounded-card py-16 px-6 text-center">
          <p className="text-ink font-semibold">
            You need an open challenge first
          </p>
          <p className="text-ink-2 mt-1.5">
            Recommendations are matched against a specific brief.
          </p>
          <Link
            href="/partner/post"
            className="inline-flex items-center justify-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Post a challenge
          </Link>
        </div>
      </div>
    );
  }

  const [ownerPage, directoryRows] = await Promise.all([
    getPartnerChallengePage(resolution.actor, { slug: selected.slug ?? "" }),
    listDirectoryStudents(db),
  ]);
  if (!ownerPage) notFound();

  // Scored through the partner-facing view of a student: pinned courses only,
  // no transcript, no GPA. The scope is the query's decision, not the deck's.
  const deck = recommendationsFor(
    directoryRows.map((row) => toDirectoryStudent(row)),
    toCandidateComparisonChallenge(ownerPage.challenge)
  );

  return (
    <div className="max-w-[1160px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        Find students
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div>
          <h1>Candidate directory</h1>
          <p className="text-ink-2 mt-2">
            Matched against{" "}
            <Link href={`/partner/challenges/${selected.slug}`}>
              {selected.title}
            </Link>
            .
          </p>
        </div>
        <Chip variant="outline-dashed">Brief-specific fit</Chip>
      </div>

      {open.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {open.map((challenge) => (
            <Link
              key={challenge.slug}
              href={`/partner/students?challenge=${challenge.slug}`}
            >
              <Chip
                variant={
                  challenge.slug === selected.slug ? "solid" : "outline-dashed"
                }
              >
                {challenge.title}
              </Chip>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {deck.map((recommendation) => (
          <div
            key={recommendation.student.id}
            className="bg-card border border-line rounded-card p-5"
          >
            <StudentCard rec={recommendation} challengeTitle={selected.title} />
          </div>
        ))}
      </div>

      <p className="text-meta text-ink-3 mt-6 pt-4 border-t border-line leading-relaxed">
        This owner-scoped view uses the selected challenge directly, including
        private briefs that are absent from ordinary marketplace discovery. Fit
        is a deterministic weighted comparison, not AI ranking. Candidate-specific
        access for invite-only challenges is managed from the challenge page by
        exact institutional email; this directory does not grant access. GPA and
        full transcripts remain withheld.
      </p>
    </div>
  );
}

function toCandidateComparisonChallenge(
  challenge: PartnerChallengeDetailRead
): Challenge {
  const eligibleColleges = (challenge.eligibilitySummary.schools ?? []).map(toCollege);
  return {
    applicantCount: challenge.applicantCount,
    assessmentMinutes: 0,
    assessmentTrack: "Cognitive",
    colleges: eligibleColleges,
    compensation:
      challenge.compensationType === "PAID"
        ? "Paid"
        : challenge.compensationType === "CREDIT"
          ? "Credit"
          : "Unpaid",
    confidential:
      challenge.visibility === "PRIVATE" || challenge.visibility === "INVITE_ONLY",
    deadline: challenge.applicationDeadline
      ? applicationDeadlineCampusDate(challenge.applicationDeadline)
      : "",
    domainTags: challenge.domain
      ? challenge.domain.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [],
    durationWeeks: challenge.durationWeeks ?? 0,
    eligibleColleges: eligibleColleges.length > 0 ? eligibleColleges : null,
    eligibleYears: challenge.eligibilitySummary.studyYears ?? [],
    hoursPerWeek: challenge.weeklyHours ?? 0,
    id: challenge.slug ?? challenge.publicId,
    interviewFormat: "",
    lockedBlocks: [],
    minGpa: challenge.eligibilitySummary.minGpa,
    orgCategory: "Challenge owner",
    orgId: "",
    orgName: null,
    postedAt: "",
    posterKind: "Company",
    responsibilities: [],
    skills: challenge.skills.map((skill) => ({
      level: skill.requirementType === "REQUIRED" ? "must" : "nice",
      name: skill.canonicalName,
    })),
    startDate: challenge.startDate ?? "",
    status: "Published",
    subType:
      challenge.subtype === "Mini-Internship"
        ? "Mini-Internship"
        : challenge.subtype === "Research Internship"
          ? "Research Internship"
          : "Project",
    suggestedFacultyIds: [],
    summary: challenge.summary,
    teamSizeMax: challenge.teamSizeMax ?? 0,
    teamSizeMin: challenge.teamSizeMin ?? 0,
    title: challenge.title,
    workMode:
      challenge.workMode === "ONSITE"
        ? "On-site"
        : challenge.workMode === "REMOTE"
          ? "Remote"
          : "Hybrid",
  };
}
