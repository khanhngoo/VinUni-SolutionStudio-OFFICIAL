import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { AssessmentError, getAssessmentResult } from "@/services/assessment.service";

export const dynamic = "force-dynamic";

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const actor = toApplicationActorContext(resolution.actor);
  let assessment: Awaited<ReturnType<typeof getAssessmentResult>>;
  try {
    assessment = await getAssessmentResult(applicationId, actor);
  } catch (error) {
    if (error instanceof AssessmentError && error.code === "FORBIDDEN") notFound();
    throw error;
  }
  if (!assessment) notFound();

  const { attempt, challenge, result } = assessment;

  if (!attempt || attempt.status === "IN_PROGRESS" || attempt.status === "SUBMITTED" || !result) {
    return (
      <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <Breadcrumb challengeSlug={challenge.slug} title={challenge.title} />
        <h1 className="mt-3.5">
          {attempt?.status === "IN_PROGRESS"
            ? "Assessment in progress"
            : "Assessment submitted"}
        </h1>
        <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
          <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
            <CheckIcon className="w-5 h-5" />
          </span>
          <p className="font-semibold text-[15px] mt-3.5">
            {attempt?.status === "IN_PROGRESS"
              ? "Your attempt is still open"
              : "Your answers are in"}
          </p>
          <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
            Results are consolidated before anyone sees them. You&apos;ll be
            notified when yours is ready, typically within three working days.
          </p>
          <Link
            href={
              attempt?.status === "IN_PROGRESS"
                ? `/assessment/${assessment.application.publicId}/take`
                : `/challenges/${challenge.slug}`
            }
            className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            {attempt?.status === "IN_PROGRESS"
              ? "Return to assessment"
              : "Back to challenge"}
          </Link>
        </div>
      </article>
    );
  }

  const passed = result.passed ?? result.overallBand !== "Below threshold";

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <Breadcrumb challengeSlug={challenge.slug} title={challenge.title} />

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip>{result.track}</Chip>
        <Chip variant={passed ? "ok" : "outline-dashed"}>
          {passed ? "Passed" : "Below threshold"}
        </Chip>
      </div>

      <h1>Your assessment result</h1>
      <p className="text-ink-2 mt-2">
        Submitted {attempt.submittedAt ? formatDate(attempt.submittedAt.toISOString()) : "for review"}
        {result.minutesTaken !== null ? ` · ${result.minutesTaken} minutes taken` : ""}
      </p>

      <div className="mt-6 bg-card border border-line rounded-card p-5">
        <h3 className="mb-2">Overall</h3>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className={cn(
              "text-h1 font-bold",
              passed ? "text-ok" : "text-warn",
            )}
          >
            {result.overallBand ?? "Reviewed"}
          </span>
          <span className="text-ink-2">
            {result.overallScore === null
              ? "qualitative band only; no numeric score was imported"
              : `${result.overallScore} overall score`}
          </span>
        </div>
      </div>

      <Section title="By section">
        <div className="bg-card border border-line rounded-card divide-y divide-line-2">
          {result.sections.length > 0 ? (
            result.sections.map((section) => (
              <div
                key={`${section.name}-${section.band}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <span className="text-ink">{section.name}</span>
                <BandPill band={section.band} />
              </div>
            ))
          ) : (
            <div className="px-4 py-3.5 text-ink-2">
              No section-level rubric rows were imported for this assessment.
            </div>
          )}
        </div>
        <p className="text-meta text-ink-3 mt-2.5">
          Bands, not rankings. You are not shown how you ranked against other
          applicants.
        </p>
      </Section>

      <Section title="What happens next">
        <div className="bg-card border border-line rounded-card p-5">
          {passed ? (
            <>
              <p className="text-ink">
                Your result goes to the partner with the rest of the shortlist.
                If they move you forward, you&apos;ll be asked to book an
                interview slot.
              </p>
              <p className="text-meta text-ink-3 mt-2">
                Decisions typically follow within five working days.
              </p>
            </>
          ) : (
            <>
              <p className="text-ink">
                This challenge is closed to you. A result below the threshold is
                final for this application.
              </p>
              <p className="text-meta text-ink-3 mt-2">
                You can apply to other challenges after a cooldown on this
                assessment track. Your other applications are unaffected.
              </p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <Link
              href={`/challenges/${challenge.slug}`}
              className="h-9 px-4 grid place-items-center rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
            >
              Back to challenge
            </Link>
            <Link
              href="/challenges"
              className="h-9 px-4 grid place-items-center rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
            >
              Browse challenges
            </Link>
          </div>
        </div>
      </Section>
    </article>
  );
}

const BAND_TONE: Record<string, string> = {
  Strong: "bg-ok-soft text-ok",
  Proficient: "bg-brand-soft text-brand",
  Developing: "bg-warn-soft text-warn",
  "Below threshold": "bg-red-soft text-red",
};

function BandPill({ band }: { band: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-card px-2.5 py-1 text-[11px] leading-none font-medium shrink-0",
        BAND_TONE[band] ?? "bg-line-2 text-ink-2",
      )}
    >
      {band}
    </span>
  );
}

function Breadcrumb({
  challengeSlug,
  title,
}: {
  challengeSlug: string;
  title: string;
}) {
  return (
    <nav className="text-meta text-ink-3">
      <Link href="/challenges">Challenges</Link>
      <span className="mx-1.5">›</span>
      <Link href={`/challenges/${challengeSlug}`}>{title}</Link>
      <span className="mx-1.5">›</span>
      Result
    </nav>
  );
}
