import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getAuthenticatedActor,
  hasActorCapability,
} from "@/auth/authenticated-actor";
import { Section } from "@/components/ui/section";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import {
  getMyApplicationForChallenge,
  toApplicationActorContext,
} from "@/services/application.service";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";

import { submitApplication } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES = {
  CONFLICT: "You or a proposed teammate already has an active application for this challenge.",
  FORBIDDEN: "Only authenticated student accounts can submit applications.",
  INVALID_TRANSITION: "This challenge is not accepting applications right now.",
  NOT_FOUND: "This challenge is no longer available.",
  VALIDATION_ERROR: "Please check the application details and try again.",
} as const;

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const [{ id: slug }, query] = await Promise.all([params, searchParams]);
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "STUDENT")) notFound();

  const challenge = await getMarketplaceChallengeBySlug(
    slug,
    marketplaceContextForActor(resolution.actor)
  );
  if (!challenge) notFound();

  const actor = toApplicationActorContext(resolution.actor);
  const existing = await getMyApplicationForChallenge(challenge.slug, actor);

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.slug}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Apply
      </nav>

      <h1 className="mt-5">Apply to {challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        {challenge.ownerOrganization.displayName} · Team of {challenge.teamSizeMin}–
        {challenge.teamSizeMax} · {challenge.weeklyHours} hours per week
      </p>

      {existing ? (
        <ExistingApplication application={existing} />
      ) : (
        <ApplicationForm
          challengeSlug={challenge.slug}
          error={errorMessage(query.error)}
        />
      )}
    </article>
  );
}

function ExistingApplication({
  application,
}: {
  application: NonNullable<Awaited<ReturnType<typeof getMyApplicationForChallenge>>>;
}) {
  return (
    <Section title="Application already submitted">
      <div className="bg-card border border-line rounded-card p-5">
        <p className="font-semibold text-ink">
          You are already part of this application.
        </p>
        <p className="text-ink-2 mt-1.5">
          Status: {application.status.replaceAll("_", " ")}
          {application.teamName ? ` · Team ${application.teamName}` : ""}
        </p>
        <p className="text-meta text-ink-3 mt-3">
          A second application cannot be submitted while this application is active.
        </p>
        <Link className="inline-block font-semibold mt-4" href="/workspace">
          Go to Your work
        </Link>
      </div>
    </Section>
  );
}

function ApplicationForm({
  challengeSlug,
  error,
}: {
  challengeSlug: string;
  error: string | null;
}) {
  return (
    <form action={submitApplication} className="mt-7 space-y-7">
      <input name="challengeSlug" type="hidden" value={challengeSlug} />
      {error ? (
        <p className="rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2">
          {error}
        </p>
      ) : null}

      <Section title="Your application">
        <p className="text-ink-2">
          You will be recorded as the accepted team leader. Your identity is taken
          from your signed-in account.
        </p>
        <Field label="Preferred role">
          <input className={INPUT_CLASS} name="preferredRole" />
        </Field>
        <Field label="Committed hours per week">
          <input className={INPUT_CLASS} min="1" name="committedHours" type="number" />
        </Field>
        <label className="flex items-center gap-2 text-ink-2 mt-4">
          <input name="availabilityConfirmed" type="checkbox" />
          I confirm my availability for this challenge.
        </label>
      </Section>

      <Section title="Team">
        <Field label="Team name">
          <input className={INPUT_CLASS} name="teamName" />
        </Field>
        <Field label="Teammate email addresses">
          <textarea
            className={`${INPUT_CLASS} min-h-24 py-2`}
            name="teammateEmails"
            placeholder="One VinUni student email per line"
          />
        </Field>
        <p className="text-meta text-ink-3 mt-2">
          Teammates are added as invited members. Invitation responses are not
          available in this flow yet.
        </p>
      </Section>

      <Section title="Motivation">
        <Field label="Why are you a good fit?">
          <textarea className={`${INPUT_CLASS} min-h-32 py-2`} name="motivation" required />
        </Field>
        <Field label="Relevant experience (optional)">
          <textarea className={`${INPUT_CLASS} min-h-24 py-2`} name="relevantExperience" />
        </Field>
      </Section>

      <button
        className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
        type="submit"
      >
        Submit application
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mt-4">
      <span className="text-meta text-ink-3 uppercase tracking-[0.07em]">{label}</span>
      <span className="block mt-1.5">{children}</span>
    </label>
  );
}

function errorMessage(value: string | undefined) {
  return value && value in ERROR_MESSAGES
    ? ERROR_MESSAGES[value as keyof typeof ERROR_MESSAGES]
    : null;
}

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-card border border-line bg-card text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
