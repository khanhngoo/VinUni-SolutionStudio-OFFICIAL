import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { listActiveCanonicalSkills } from "@/db/queries/skills";
import { formatDate as formatDateOnlyString } from "@/lib/dates";
import { getPartnerChallengePage } from "@/services/partner.service";

import { submitChallengeForReviewAction } from "./actions";
import { ChallengeEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = new Set(["DRAFT", "REVISION_REQUESTED"]);

const ERROR_MESSAGES: Record<string, string> = {
  CONFLICT: "That change conflicts with an existing challenge.",
  FORBIDDEN: "Your account cannot make this change.",
  INVALID_TRANSITION: "This challenge is not in an editable status right now.",
  NOT_FOUND: "This challenge could not be found.",
  VALIDATION_ERROR: "Please check the challenge details and try again.",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * One owned challenge, read live from PostgreSQL: posted terms, applications
 * against it, and — while editable — the live authoring form
 * (`updateChallengeDraft` + canonical skill replacement +
 * `submitChallengeForReview`). `getPartnerChallengePage` scopes both by the
 * actor's real EXTERNAL_PARTNER organization — a challenge/application
 * belonging to a different owner organization resolves to `null` here, the
 * same 404 shape as a nonexistent challenge, so no cross-partner metadata
 * leaks through this route.
 */
export default async function PartnerChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    details?: string;
    error?: string;
    submitted?: string;
    updated?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const errorDetails = query.details ? query.details.split("|").filter(Boolean) : [];
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  const page = await getPartnerChallengePage(resolution.actor, { slug: id });
  if (!page) notFound();

  const { applications, canReadApplications, challenge } = page;
  const isEditable = EDITABLE_STATUSES.has(challenge.status);
  const canonicalSkills = isEditable ? await listActiveCanonicalSkills() : [];

  return (
    <div className="max-w-[1160px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        {challenge.title}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <Chip>{challenge.status.replaceAll("_", " ")}</Chip>
            <Chip variant="outline-dashed">{challenge.visibility.replaceAll("_", " ")}</Chip>
            {challenge.subtype ? <Chip>{challenge.subtype}</Chip> : null}
          </div>
          <h1>{challenge.title}</h1>
          <p className="text-ink-2 mt-2">
            {challenge.applicantCount} team{challenge.applicantCount === 1 ? "" : "s"} applied ·
            Managed by {challenge.managingOrganizationName}
          </p>
        </div>

        {challenge.status !== "DRAFT" && challenge.slug ? (
          <Link
            href={`/challenges/${challenge.slug}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            View as student
          </Link>
        ) : null}
      </div>

      {query.created ? (
        <Banner tone="ok">Draft created. Nothing has been submitted for review yet.</Banner>
      ) : null}
      {query.updated ? <Banner tone="ok">Changes saved.</Banner> : null}
      {query.submitted ? <Banner tone="ok">Submitted for review.</Banner> : null}
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

      {challenge.status === "REVISION_REQUESTED" ? (
        <Section title="Revision requested">
          {latestDecision(challenge.reviews) ? (
            <div className="bg-card border border-line rounded-card p-4">
              <p className="text-ink-2 leading-relaxed">
                {latestDecision(challenge.reviews)?.comments ?? "No comment was left."}
              </p>
              <p className="text-meta text-ink-3 mt-2">
                {formatDate(latestDecision(challenge.reviews)?.reviewedAt ?? null)}
              </p>
            </div>
          ) : (
            <p className="text-ink-2">
              A revision was requested, but no review comment is on record.
            </p>
          )}
        </Section>
      ) : null}

      {isEditable ? (
        <Section title={challenge.status === "DRAFT" ? "Edit draft" : "Edit and resubmit"}>
          <ChallengeEditForm
            canonicalSkills={canonicalSkills}
            initialSkills={challenge.skills.map((skill) => ({
              canonicalName: skill.canonicalName,
              // The picker only authors REQUIRED/PREFERRED (see Part A); an
              // existing OPTIONAL row (not producible by this form) is
              // shown pre-checked as REQUIRED, matching this form's own
              // two-state selector.
              requirementType: skill.requirementType === "PREFERRED" ? "PREFERRED" : "REQUIRED",
            }))}
            initialValues={{
              description: challenge.description,
              domain: challenge.domain ?? null,
              durationWeeks: challenge.durationWeeks,
              subtype: challenge.subtype,
              summary: challenge.summary,
              teamSizeMax: challenge.teamSizeMax,
              teamSizeMin: challenge.teamSizeMin,
              title: challenge.title,
              weeklyHours: challenge.weeklyHours,
            }}
            slug={id}
          />

          <form action={submitChallengeForReviewAction} className="mt-5">
            <input type="hidden" name="slug" value={id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-10 px-5 rounded-card border border-brand text-brand font-semibold hover:bg-brand hover:text-white"
            >
              Submit for review
            </button>
          </form>
        </Section>
      ) : (
        <Section title="Lifecycle">
          <p className="text-ink-2">
            {lifecycleMessage(challenge.status)}
          </p>
        </Section>
      )}

      <Section
        title="Applications"
        aside={canReadApplications ? `${applications.length} total` : "requires ADMIN/CONTACT_PERSON role"}
      >
        {!canReadApplications ? (
          <EmptyRow>
            Your organization membership role does not include application
            read access (requires ADMIN or CONTACT_PERSON).
          </EmptyRow>
        ) : applications.length === 0 ? (
          <EmptyRow>No applications yet.</EmptyRow>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {applications.map((application) => (
                <tr
                  key={application.publicId}
                  className="border-b border-line-2 last:border-b-0"
                >
                  <td className="py-2.5 pr-3 align-middle">
                    <Link
                      href={`/applications/${application.publicId}`}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {application.teamName ?? application.memberSummary.leaderName ?? "Unnamed team"}
                    </Link>
                    <p className="text-meta text-ink-3 mt-0.5">
                      {application.memberSummary.total} member{application.memberSummary.total === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 align-middle w-[140px]">
                    <Chip>{application.status.replaceAll("_", " ")}</Chip>
                  </td>
                  <td className="py-2.5 align-middle w-[110px] text-right">
                    <span className="text-meta text-ink-3 whitespace-nowrap">
                      {application.submittedAt ? formatDate(application.submittedAt) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-meta text-ink-3 mt-2.5 leading-relaxed">
          Read-only: no production workflow exists yet for a partner to move
          an application between statuses.
        </p>
      </Section>

      <Section title="What you posted">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Team size" value={sizeLabel(challenge.teamSizeMin, challenge.teamSizeMax)} />
          <Stat
            label="Commitment"
            value={`${challenge.weeklyHours ?? "—"} hrs/wk · ${challenge.durationWeeks ?? "—"} wks`}
          />
          <Stat label="Compensation" value={challenge.compensationType.replaceAll("_", " ")} />
          <Stat label="Work mode" value={challenge.workMode?.replaceAll("_", " ") ?? "—"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <div className="bg-card border border-line rounded-card p-5">
            <h3 className="text-h3 text-ink-3">Summary students see</h3>
            <p className="text-ink-2 mt-2 leading-relaxed">{challenge.summary}</p>
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
          </div>

          <div className="bg-card border border-line rounded-card p-5">
            <h3 className="text-h3 text-ink-3">Gating</h3>
            <dl className="mt-2 flex flex-col gap-2">
              <Row
                label="Minimum GPA"
                value={
                  challenge.eligibilitySummary.minGpa === null
                    ? "None"
                    : String(challenge.eligibilitySummary.minGpa)
                }
              />
              <Row
                label="Eligible years"
                value={
                  challenge.eligibilitySummary.studyYears === null
                    ? "Any"
                    : challenge.eligibilitySummary.studyYears.join(", ")
                }
              />
              <Row
                label="Eligible schools"
                value={
                  challenge.eligibilitySummary.schools === null
                    ? "All schools"
                    : challenge.eligibilitySummary.schools.join(", ")
                }
              />
              <Row
                label="Deadline"
                value={
                  challenge.applicationDeadline
                    ? formatDate(challenge.applicationDeadline)
                    : "None set"
                }
              />
              <Row
                label="Starts"
                value={challenge.startDate ? formatDateOnlyString(challenge.startDate) : "Not set"}
              />
            </dl>
          </div>
        </div>
      </Section>

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

function latestDecision(reviews: { comments: string | null; decision: string; reviewedAt: Date | null }[]) {
  return reviews.find((review) => review.decision === "REVISION_REQUESTED") ?? null;
}

function lifecycleMessage(status: string) {
  switch (status) {
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "Submitted for review. You cannot edit or review your own challenge while it is under review.";
    case "APPROVED":
      return "Approved by the managing unit. Only the managing unit can publish it.";
    case "APPLICATIONS_OPEN":
      return "Published. Students can now apply.";
    case "CANCELLED":
      return "This challenge was cancelled during review.";
    default:
      return `Current status: ${status.replaceAll("_", " ")}.`;
  }
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

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line rounded-card py-8 px-6 text-center">
      <p className="text-ink-2">{children}</p>
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
