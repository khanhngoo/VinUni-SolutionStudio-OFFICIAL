import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatDate as formatDateOnlyString } from "@/lib/dates";
import { getReviewChallengePage } from "@/services/review.service";

import { publishChallengeAction, recordReviewDecisionAction } from "./actions";

export const dynamic = "force-dynamic";

const REVIEWABLE_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW"]);

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: "That action conflicts with the challenge's current state.",
  FORBIDDEN: "Your organization is not authorized to review or publish this challenge.",
  INVALID_TRANSITION: "This challenge is no longer in a status that allows that action.",
  NOT_FOUND: "This challenge could not be found.",
  VALIDATION_ERROR: "Please provide a valid decision.",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A single challenge for the review runtime. `getReviewChallengePage`
 * resolves it only against the actor's own active INTERNAL_UNIT
 * organization memberships — a slug managed by an unrelated internal unit
 * (e.g. an E-Lab admin guessing a CAID-managed slug) resolves to `null`
 * here and this page renders `notFound()`, the same 404 shape as a
 * nonexistent challenge. No metadata about who actually manages it leaks
 * through this route.
 */
export default async function ReviewChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ decided?: string; details?: string; error?: string; published?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const errorDetails = query.details ? query.details.split("|").filter(Boolean) : [];
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  // Independent capability check — never relies solely on `ReviewLayout`.
  if (!hasActorCapability(resolution.actor, "INTERNAL_UNIT_MEMBER")) notFound();

  const page = await getReviewChallengePage(resolution.actor, slug);
  if (!page) notFound();

  const { canPublish, canReview, challenge } = page;

  return (
    <div className="max-w-[1080px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/review">Review queue</Link>
        <span className="mx-1.5">›</span>
        {challenge.title}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <Chip>{challenge.status.replaceAll("_", " ")}</Chip>
            {challenge.subtype ? <Chip variant="outline-dashed">{challenge.subtype}</Chip> : null}
          </div>
          <h1>{challenge.title}</h1>
          <p className="text-ink-2 mt-2">Owned by {challenge.ownerOrganizationName}</p>
        </div>
      </div>

      {query.decided ? <Banner tone="ok">Review decision recorded.</Banner> : null}
      {query.published ? <Banner tone="ok">Published — applications are now open.</Banner> : null}
      {query.error ? (
        <Banner tone="error">
          <p>{ERROR_MESSAGES[query.error] ?? "Something went wrong."}</p>
          {errorDetails.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {errorDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </Banner>
      ) : null}

      <Section title="What was posted">
        <p className="text-ink-2 leading-relaxed">{challenge.summary}</p>
        <p className="text-ink-2 leading-relaxed mt-3">{challenge.description}</p>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <Stat label="Team size" value={sizeLabel(challenge.teamSizeMin, challenge.teamSizeMax)} />
          <Stat
            label="Commitment"
            value={`${challenge.weeklyHours ?? "—"} hrs/wk · ${challenge.durationWeeks ?? "—"} wks`}
          />
          <Stat label="Compensation" value={challenge.compensationType.replaceAll("_", " ")} />
          <Stat label="Work mode" value={challenge.workMode?.replaceAll("_", " ") ?? "—"} />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {challenge.skills.map((skill) => (
            <Chip
              key={skill.canonicalName}
              variant={skill.requirementType === "REQUIRED" ? "default" : "outline-dashed"}
            >
              {skill.canonicalName}
            </Chip>
          ))}
        </div>

        <dl className="mt-4 flex flex-col gap-2 max-w-[420px]">
          <Row
            label="Deadline"
            value={challenge.applicationDeadline ? formatDate(challenge.applicationDeadline) : "None set"}
          />
          <Row
            label="Starts"
            value={challenge.startDate ? formatDateOnlyString(challenge.startDate) : "Not set"}
          />
          <Row
            label="Minimum GPA"
            value={
              challenge.eligibilitySummary.minGpa === null
                ? "None"
                : String(challenge.eligibilitySummary.minGpa)
            }
          />
        </dl>
      </Section>

      {REVIEWABLE_STATUSES.has(challenge.status) ? (
        <Section title="Review decision">
          {canReview ? (
            <form action={recordReviewDecisionAction} className="flex flex-col gap-3 max-w-[520px]">
              <input type="hidden" name="slug" value={challenge.slug ?? ""} />
              <textarea
                name="comments"
                rows={3}
                placeholder="Comments (shown to the partner)"
                className="w-full px-3 py-2 rounded-card border border-line bg-card text-ink"
              />
              <div className="flex gap-2.5 flex-wrap">
                <button
                  type="submit"
                  name="decision"
                  value="APPROVED"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
                >
                  Approve
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="REVISION_REQUESTED"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
                >
                  Request revision
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="REJECTED"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-card border border-red/40 text-red font-medium hover:bg-red/5"
                >
                  Reject
                </button>
              </div>
            </form>
          ) : (
            <p className="text-ink-2">
              Your role in the managing organization does not permit review
              decisions. Ask an administrator for reviewer access.
            </p>
          )}
        </Section>
      ) : null}

      {challenge.status === "APPROVED" ? (
        <Section title="Publish">
          {canPublish ? (
            <form action={publishChallengeAction}>
              <input type="hidden" name="slug" value={challenge.slug ?? ""} />
              <button
                type="submit"
                className="inline-flex items-center justify-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
              >
                Publish challenge
              </button>
            </form>
          ) : (
            <p className="text-ink-2">
              Publishing is done by a reviewer on your team.
            </p>
          )}
        </Section>
      ) : null}

      {challenge.reviews.length > 0 ? (
        <Section title="Review history">
          <ul className="flex flex-col gap-2.5">
            {challenge.reviews.map((review, index) => (
              <li key={index} className="bg-card border border-line rounded-card p-4">
                <div className="flex items-center gap-2">
                  <Chip variant={review.decision === "APPROVED" ? "ok" : undefined}>
                    {review.decision.replaceAll("_", " ")}
                  </Chip>
                  <span className="text-meta text-ink-3">{formatDate(review.reviewedAt)}</span>
                  <span className="text-meta text-ink-3">· {review.reviewerName}</span>
                </div>
                {review.comments ? (
                  <p className="text-ink-2 mt-2 leading-relaxed">{review.comments}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function sizeLabel(min: number | null, max: number | null) {
  if (min === null && max === null) return "—";
  if (min === max) return `${min}`;
  return `${min ?? "?"}–${max ?? "?"}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <p className="text-meta text-ink-3">{label}</p>
      <p className="font-semibold text-[15px] text-brand mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "error" | "ok" }) {
  return (
    <div
      className={
        tone === "ok"
          ? "mt-4 border border-line bg-line-2 text-ink-2 rounded-card px-4 py-3"
          : "mt-4 border border-red/40 bg-red/5 text-red rounded-card px-4 py-3"
      }
    >
      {children}
    </div>
  );
}
