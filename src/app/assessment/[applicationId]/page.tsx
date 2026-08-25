import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PreflightCheck } from "@/components/assessment/preflight-check";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { deadlineLabel } from "@/lib/dates";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { getAssessmentPreflight } from "@/services/assessment.service";
import { startAssessmentForAuthenticatedActor } from "./actions";

export const dynamic = "force-dynamic";

export default async function AssessmentPreflightPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const actor = toApplicationActorContext(resolution.actor);
  const preflight = await getAssessmentPreflight(applicationId, actor);
  if (!preflight) notFound();

  const startAction = startAssessmentForAuthenticatedActor.bind(
    null,
    preflight.application.publicId
  );

  if (
    preflight.state === "NOT_OPEN" ||
    preflight.state === "REVIEWED" ||
    preflight.state === "SUBMITTED"
  ) {
    return (
      <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
        <Breadcrumb
          challengeSlug={preflight.challenge.slug}
          title={preflight.challenge.title}
        />
        <h1 className="mt-3.5">
          {preflight.state === "SUBMITTED"
            ? "Assessment submitted"
            : "Assessment closed"}
        </h1>

        <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
          <span className="w-[26px] h-[26px] rounded-card bg-line-2 border border-line grid place-items-center text-ink-2 mx-auto">
            <LockIcon className="w-3.5 h-3.5" />
          </span>
          <p className="font-semibold text-ink mt-3">
            {preflight.state === "REVIEWED"
              ? "You have already taken this assessment."
              : preflight.state === "SUBMITTED"
                ? "Your assessment is awaiting review."
                : "This assessment is not open to you right now."}
          </p>
          <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
            Each assessment allows a single attempt. There is no restart once it
            has been submitted.
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-5">
            {preflight.state === "REVIEWED" ||
            preflight.state === "SUBMITTED" ? (
              <Link
                href={`/assessment/${preflight.application.publicId}/result`}
                className="h-9 px-4 grid place-items-center rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
              >
                View status
              </Link>
            ) : null}
            <Link
              href={`/challenges/${preflight.challenge.slug}`}
              className="h-9 px-4 grid place-items-center rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
            >
              Back to challenge
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <Breadcrumb
        challengeSlug={preflight.challenge.slug}
        title={preflight.challenge.title}
      />

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip>{preflight.trackLabel}</Chip>
        <Chip variant="warn">Proctored · lockdown</Chip>
      </div>

      <h1>Before you begin</h1>
      <p className="text-ink-2 mt-2 max-w-[62ch]">
        This assessment is timed, monitored and single-attempt. Work through the
        checks below, then read what is recorded during the test.
      </p>

      {preflight.challenge.applicationDeadline ? (
        <p className="text-meta text-warn font-medium mt-3">
          This challenge closes{" "}
          {deadlineLabel(
            preflight.challenge.applicationDeadline.toISOString()
          ).toLowerCase()}{" "}
          — your attempt has to be in before then.
        </p>
      ) : null}

      <PreflightCheck
        applicationId={preflight.application.publicId}
        trackLabel={preflight.trackLabel}
        minutes={preflight.assessment.timeLimitMinutes ?? 0}
        itemCount={preflight.itemCountLabel}
        startAction={startAction}
      />
    </article>
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
      Assessment
    </nav>
  );
}
