import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OfferCountdown } from "@/components/offer/offer-countdown";
import { OfferFlow } from "@/components/offer/offer-flow";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/dates";
import { offerStatusLabel } from "@/lib/labels";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { toApplicationActorContext } from "@/services/application.service";
import { getOfferDetail, hasAcceptedChallengeNda } from "@/services/offer.service";
import { getMarketplaceChallengeBySlug } from "@/services/challenge.service";
import { marketplaceContextForActor } from "@/lib/challenge-marketplace";
import { listRevealedResourceNames } from "@/services/workspace.service";
import { acceptNdaForAuthenticatedActor, respondToOfferForAuthenticatedActor } from "./actions";

export const dynamic = "force-dynamic";

export default async function OfferPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  const actor = toApplicationActorContext(resolution.actor);
  const detail = await getOfferDetail(applicationId, actor);
  if (!detail) notFound();

  const respondAction = respondToOfferForAuthenticatedActor.bind(
    null,
    detail.application.publicId
  );
  const ndaAction = acceptNdaForAuthenticatedActor.bind(
    null,
    detail.application.publicId
  );

  // The reveal payload is loaded only once this individual has earned it. A
  // browsing student never reaches this branch, so T3 content is never in the
  // page payload for anyone who has not signed.
  const ndaAccepted =
    detail.offer.status === "ACCEPTED"
      ? await hasAcceptedChallengeNda(detail.application.publicId, actor)
      : false;
  const revealed =
    detail.offer.status === "ACCEPTED" &&
    (!detail.offer.terms.ndaRequired || ndaAccepted);

  const revealedChallenge = revealed
    ? await getMarketplaceChallengeBySlug(detail.challenge.slug, {
        ...marketplaceContextForActor(resolution.actor),
        hasSelectedApplication: true,
      })
    : null;
  const resourceNames = revealed
    ? await listRevealedResourceNames(detail.application.publicId, actor)
    : [];
  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${detail.challenge.slug}`}>{detail.challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Invitation
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant="ok">Selected</Chip>
        {detail.challenge.subtype ? <Chip>{detail.challenge.subtype}</Chip> : null}
        {detail.offer.terms.ndaRequired ? <Chip variant="warn">NDA required</Chip> : null}
      </div>

      <h1>You&apos;ve been selected</h1>
      <p className="text-ink-2 mt-2 max-w-[62ch]">
        {detail.challenge.ownerOrganizationName} has chosen your team for{" "}
        <strong className="text-ink font-semibold">{detail.challenge.title}</strong>.
        Review the issued terms below.
      </p>

      <div className="mt-6 bg-brand rounded-card px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-white">
          <p className="text-[12px] text-white/70">Respond by</p>
          <p className="font-semibold mt-0.5">
            {detail.offer.respondBy ? formatDate(detail.offer.respondBy.toISOString()) : "No response deadline"}
          </p>
        </div>
        <div className="bg-card rounded-card px-4 py-2.5">
          {detail.offer.isExpired ? <span className="font-semibold text-warn">Invitation lapsed</span> : detail.offer.status === "PENDING" && detail.offer.remainingHours !== null ? <OfferCountdown initialHours={detail.offer.remainingHours} /> : <span className="font-semibold text-ink">{offerStatusLabel(detail.offer.status)}</span>}
        </div>
      </div>

      <Section title="What your team is accepting">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="Workload" value={detail.offer.terms.hoursPerWeek ? `${detail.offer.terms.hoursPerWeek} hrs / wk` : "To be confirmed"} />
          <Stat label="Duration" value={detail.offer.terms.durationWeeks ? `${detail.offer.terms.durationWeeks} weeks` : "To be confirmed"} />
          <Stat label="Starts" value={detail.offer.terms.startDate ? formatDate(detail.offer.terms.startDate) : "To be confirmed"} />
          <Stat label="Managing team" value={detail.challenge.managingOrganizationName} />
        </dl>

        <div className="mt-2.5 bg-card border border-line rounded-card p-5">
          <h3 className="mb-1.5">Issued terms</h3>
          <p className="text-ink">{detail.offer.terms.compensationNote ?? "No compensation note was issued."}</p>
          {detail.offer.terms.ndaRequired ? <p className="text-meta text-warn mt-2">Team offer acceptance is separate from each required individual&apos;s NDA acceptance.</p> : null}
        </div>
      </Section>

      <OfferFlow
        applicationId={detail.application.publicId}
        canRespond={detail.canRespond}
        challengeSlug={detail.challenge.slug}
        challengeTitle={detail.challenge.title}
        expired={detail.offer.isExpired}
        fullBrief={revealedChallenge?.fullBrief ?? null}
        ndaAccepted={ndaAccepted}
        ndaAction={ndaAction}
        ndaRequired={detail.offer.terms.ndaRequired}
        orgName={detail.challenge.ownerOrganizationName}
        posterContact={revealedChallenge?.contactPerson ?? null}
        resourceNames={resourceNames}
        respondAction={respondAction}
        respondedByName={detail.offer.respondedByName}
        status={detail.offer.status}
      />
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-line-2 rounded-card px-3.5 py-3"><dt className="text-meta text-ink-3">{label}</dt><dd className="font-semibold text-[15px] text-brand mt-1">{value}</dd></div>;
}
