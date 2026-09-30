import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatNullableDate } from "@/lib/dates";
import { getAssessmentGradingDetail } from "@/services/assessment-grading.service";

import { gradeAssessmentForAuthenticatedFaculty } from "./actions";
import { GradingForm } from "./grading-form";

export const dynamic = "force-dynamic";

export default async function AssessmentGradingPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!resolution.actor.facultyProfile) notFound();

  const detail = await getAssessmentGradingDetail(
    attemptId,
    resolution.actor.user.userId
  );
  if (!detail) notFound();

  const gradeAction = gradeAssessmentForAuthenticatedFaculty.bind(
    null,
    attemptId
  );

  return (
    <article className="max-w-[920px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/faculty">Faculty dashboard</Link>
        <span className="mx-1.5">›</span>
        Assessment review
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={detail.attempt.status === "SUBMITTED" ? "warn" : "ok"}>
          {detail.attempt.status === "SUBMITTED" ? "Awaiting review" : "Reviewed"}
        </Chip>
        <Chip>
          {detail.assessment.passingScore === null
            ? "Threshold not configured"
            : `Pass threshold ${detail.assessment.passingScore}`}
        </Chip>
      </div>

      <h1>{detail.challengeTitle}</h1>
      <p className="text-ink-2 mt-2">
        {detail.application.teamName ?? "Individual application"} · submitted {formatNullableDate(detail.attempt.submittedAt)}
      </p>

      <Section title="Submitted responses">
        <div className="flex flex-col gap-3">
          {detail.questions.map((question, index) => (
            <div
              key={question.questionKey}
              className="bg-card border border-line rounded-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{question.questionType.replaceAll("_", " ")}</Chip>
                {question.isCorrect === null ? null : (
                  <Chip variant={question.isCorrect ? "ok" : "warn"}>
                    {question.isCorrect ? "Correct" : "Incorrect"}
                  </Chip>
                )}
                {question.maxScore === null ? null : (
                  <span className="text-meta text-ink-3">
                    Definition max {question.maxScore}
                  </span>
                )}
              </div>
              <p className="font-semibold text-ink mt-3">
                {index + 1}. {question.prompt}
              </p>
              <pre className="mt-3 whitespace-pre-wrap rounded-card bg-paper border border-line-2 px-3 py-3 text-body text-ink-2 font-sans">
                {question.response ?? "No response submitted"}
              </pre>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Authoritative review">
        {detail.attempt.status === "SUBMITTED" ? (
          <GradingForm
            action={gradeAction}
            passingScore={detail.assessment.passingScore}
          />
        ) : (
          <div className="bg-card border border-line rounded-card p-5">
            <p className="font-semibold text-ink">Review complete</p>
            <p className="text-ink-2 mt-1.5">
              Overall score: {detail.reviewedScore?.overallScore ?? "Unavailable"}
            </p>
            {detail.reviewedScore?.rubricNotes ? (
              <p className="text-ink-2 mt-3 whitespace-pre-wrap">
                {detail.reviewedScore.rubricNotes}
              </p>
            ) : null}
          </div>
        )}
      </Section>
    </article>
  );
}
