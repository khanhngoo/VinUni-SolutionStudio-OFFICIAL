import Link from "next/link";
import { notFound } from "next/navigation";
import { PreflightCheck } from "@/components/assessment/preflight-check";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import {
  cognitiveMinutes,
  codingProblems,
  isTechnicalTrack,
  totalCognitiveQuestions,
} from "@/lib/data/assessment";
import { deadlineLabel } from "@/lib/dates";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
} from "@/lib/queries";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

export default async function AssessmentPreflightPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const technical = isTechnicalTrack(challenge.assessmentTrack);

  // PRD §8.4, single attempt: a completed test cannot be retaken.
  if (application.stage !== "TEST_PENDING") {
    return (
      <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <Breadcrumb challengeId={challenge.id} title={challenge.title} />
        <h1 className="mt-3.5">Assessment closed</h1>

        <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
          <span className="w-[26px] h-[26px] rounded-card bg-line-2 border border-line grid place-items-center text-ink-2 mx-auto">
            <LockIcon className="w-3.5 h-3.5" />
          </span>
          <p className="font-semibold text-ink mt-3">
            {application.testResult
              ? "You have already taken this assessment."
              : "This assessment is not open to you right now."}
          </p>
          <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
            Each assessment allows a single attempt. There is no restart once it
            has been submitted.
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-5">
            {application.testResult ? (
              <Link
                href={`/assessment/${application.id}/result`}
                className="h-9 px-4 grid place-items-center rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
              >
                View your result
              </Link>
            ) : null}
            <Link
              href={`/challenges/${challenge.id}`}
              className="h-9 px-4 grid place-items-center rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
            >
              Back to challenge
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const minutes = technical
    ? challenge.assessmentMinutes
    : cognitiveMinutes();
  const itemCount = technical
    ? `${codingProblems.length} problems`
    : `${totalCognitiveQuestions()} questions across 4 sections`;

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <Breadcrumb challengeId={challenge.id} title={challenge.title} />

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip>{challenge.assessmentTrack}</Chip>
        <Chip variant="warn">Proctored · lockdown</Chip>
      </div>

      <h1>Before you begin</h1>
      <p className="text-ink-2 mt-2 max-w-[62ch]">
        This assessment is timed, monitored and single-attempt. Work through the
        checks below, then read what is recorded during the test.
      </p>

      {application.nextActionDue ? (
        <p className="text-meta text-warn font-medium mt-3">
          Your 7-day window closes {deadlineLabel(application.nextActionDue).toLowerCase()}.
        </p>
      ) : null}

      <PreflightCheck
        applicationId={application.id}
        trackLabel={challenge.assessmentTrack}
        minutes={minutes}
        itemCount={itemCount}
      />
    </article>
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
      Assessment
    </nav>
  );
}
