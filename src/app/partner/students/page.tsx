import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { SwipeDeck } from "@/components/partner/swipe-deck";
import { Chip } from "@/components/ui/chip";
import { db } from "@/db";
import { listDirectoryStudents } from "@/db/queries/students";
import { toApplyChallenge, toDirectoryStudent } from "@/lib/apply-view";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { recommendationsFor } from "@/lib/recommendations";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";
import { getPartnerDashboard } from "@/services/partner.service";

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

  const [detail, directoryRows] = await Promise.all([
    getMarketplaceChallengeBySlug(
      selected.slug ?? "",
      marketplaceContextForActor(resolution.actor)
    ),
    listDirectoryStudents(db),
  ]);
  if (!detail) notFound();

  // Scored through the partner-facing view of a student: pinned courses only,
  // no transcript, no GPA. The scope is the query's decision, not the deck's.
  const deck = recommendationsFor(
    directoryRows.map((row) => toDirectoryStudent(row)),
    toApplyChallenge(detail)
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
          <h1>Recommended students</h1>
          <p className="text-ink-2 mt-2">
            Matched against{" "}
            <Link href={`/partner/challenges/${selected.slug}`}>
              {selected.title}
            </Link>
            .
          </p>
        </div>
        <Chip variant="accent">✦ AI shortlist</Chip>
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

      <div className="mt-6">
        <SwipeDeck deck={deck} challengeTitle={selected.title} />
      </div>

      <p className="text-meta text-ink-3 mt-6 pt-4 border-t border-line leading-relaxed">
        The fit score is this student against this brief, and the reasons under
        it are what it is made of — a weighted count of matched skills,
        availability, assessment band and course overlap, not a learned model
        and not a rank across challenges or against their peers. What stays
        withheld is unchanged: no GPA, no transcript, and the courses on a card
        are ones the student chose to showcase.
      </p>
    </div>
  );
}
