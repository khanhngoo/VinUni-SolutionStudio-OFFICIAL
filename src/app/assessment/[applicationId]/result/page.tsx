import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
} from "@/lib/queries";
import type { ScoreBand, TestResult } from "@/lib/types";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const result = application.testResult;

  // Reached straight after finishing a walkthrough: nothing is persisted, so
  // there is no result to show yet. Say that plainly rather than invent a score.
  if (!result) {
    return (
      <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <Breadcrumb challengeId={challenge.id} title={challenge.title} />
        <h1 className="mt-3.5">Assessment submitted</h1>
        <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
          <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
            <CheckIcon className="w-5 h-5" />
          </span>
          <p className="font-semibold text-[15px] mt-3.5">
            Your answers are in
          </p>
          <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
            Results are consolidated with the other candidates&apos; before
            anyone sees them. You&apos;ll be notified when yours is ready —
            typically within three working days.
          </p>
          <Link
            href={`/challenges/${challenge.id}`}
            className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Back to challenge
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <Breadcrumb challengeId={challenge.id} title={challenge.title} />

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip>{result.track}</Chip>
        <Chip variant={result.passed ? "ok" : "outline-dashed"}>
          {result.passed ? "Passed" : "Below threshold"}
        </Chip>
      </div>

      <h1>Your assessment result</h1>
      <p className="text-ink-2 mt-2">
        Submitted {formatDate(result.submittedAt)} · {result.minutesTaken} minutes
        taken
      </p>

      <div className="mt-6 bg-card border border-line rounded-card p-5">
        <h3 className="mb-2">Overall</h3>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className={cn(
              "text-h1 font-bold",
              result.passed ? "text-ok" : "text-warn",
            )}
          >
            {result.overallBand}
          </span>
          <span className="text-ink-2">
            {result.passed
              ? "above the threshold for this challenge"
              : "below the threshold for this challenge"}
          </span>
        </div>
      </div>

      <Section title="By section">
        <div className="bg-card border border-line rounded-card divide-y divide-line-2">
          {result.sections.map((section) => (
            <div
              key={section.name}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <span className="text-ink">{section.name}</span>
              <BandPill band={section.band} />
            </div>
          ))}
        </div>
        <p className="text-meta text-ink-3 mt-2.5">
          Bands, not scores. You are not shown how you ranked against other
          applicants.
        </p>
      </Section>

      <Section title="What happens next">
        <div className="bg-card border border-line rounded-card p-5">
          {result.passed ? (
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
                You can apply to other challenges after a 30-day cooldown on the{" "}
                {result.track} track. Your other applications are unaffected.
              </p>
            </>
          )}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <Link
              href={`/challenges/${challenge.id}`}
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

const BAND_TONE: Record<ScoreBand, string> = {
  Strong: "bg-ok-soft text-ok",
  Proficient: "bg-brand-soft text-brand",
  Developing: "bg-warn-soft text-warn",
  "Below threshold": "bg-red-soft text-red",
};

function BandPill({ band }: { band: TestResult["sections"][number]["band"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-card px-2.5 py-1 text-[11px] leading-none font-medium shrink-0",
        BAND_TONE[band],
      )}
    >
      {band}
    </span>
  );
}

function Breadcrumb({
  challengeId,
  title,
}: {
  challengeId: string;
  title: string;
}) {
  return (
    <nav className="text-meta text-ink-3">
      <Link href="/challenges">Challenges</Link>
      <span className="mx-1.5">›</span>
      <Link href={`/challenges/${challengeId}`}>{title}</Link>
      <span className="mx-1.5">›</span>
      Result
    </nav>
  );
}
