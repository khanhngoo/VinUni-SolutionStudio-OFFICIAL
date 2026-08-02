import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferCountdown } from "@/components/offer/offer-countdown";
import { OfferFlow } from "@/components/offer/offer-flow";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/dates";
import { hoursUntil } from "@/lib/pipeline";
import {
  getAllApplicationIds,
  getApplicationById,
  getChallengeById,
  getFacultyById,
} from "@/lib/queries";

export function generateStaticParams() {
  return getAllApplicationIds().map((applicationId) => ({ applicationId }));
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const application = getApplicationById(applicationId);
  if (!application) notFound();

  const challenge = getChallengeById(application.challengeId);
  if (!challenge) notFound();

  const offer = application.offer;
  if (!offer) notFound();

  const supervisor = getFacultyById(application.facultySupervisorId);
  const hoursLeft = hoursUntil(offer.respondBy);
  const expired = hoursLeft <= 0;

  // The org is revealed at this point even when the listing was confidential.
  const orgName = challenge.orgName ?? challenge.orgCategory;

  // T3 content the reveal opens. ACTIVE applications carry a real project
  // record; for an INVITED one the brief is composed from what we have.
  const fullBrief = application.project?.fullBrief ?? [
    challenge.summary,
    `You will work directly with ${orgName} for ${offer.durationWeeks} weeks at roughly ${offer.hoursPerWeek} hours per week, starting ${formatDate(offer.startDate)}.`,
  ];
  const resourceNames = application.project?.resources.map((r) => r.name) ?? [
    "Partner datasets and access credentials",
    "Reference documentation and prior internal work",
    "Direct line to the partner team",
  ];
  const posterContact = application.project?.posterContact ?? {
    name: "Partner lead",
    role: `${orgName}`,
    email: "released-on-kickoff@partner.example",
  };

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Invitation
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant="ok">Selected</Chip>
        <Chip>{challenge.subType}</Chip>
        {offer.ndaRequired ? <Chip variant="warn">NDA required</Chip> : null}
      </div>

      <h1>You&apos;ve been selected</h1>
      <p className="text-ink-2 mt-2 max-w-[62ch]">
        {orgName} has chosen you for{" "}
        <strong className="text-ink font-semibold">{challenge.title}</strong>.
        Review the terms below and respond before the window closes.
      </p>

      <div className="mt-6 bg-brand rounded-card px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-white">
          <p className="text-[12px] text-white/70">Respond by</p>
          <p className="font-semibold mt-0.5">
            {formatDate(offer.respondBy.slice(0, 10))}
          </p>
        </div>
        <div className="bg-card rounded-card px-4 py-2.5">
          {expired ? (
            <span className="font-semibold text-warn">Invitation lapsed</span>
          ) : (
            <OfferCountdown initialHours={hoursLeft} />
          )}
        </div>
      </div>

      <Section title="What you're accepting">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="Workload" value={`${offer.hoursPerWeek} hrs / wk`} />
          <Stat label="Duration" value={`${offer.durationWeeks} weeks`} />
          <Stat label="Starts" value={formatDate(offer.startDate)} />
          <Stat
            label="Supervisor"
            value={supervisor ? supervisor.name.replace("Dr. ", "Dr ") : "—"}
          />
        </dl>

        <div className="mt-2.5 bg-card border border-line rounded-card p-5">
          <h3 className="mb-1.5">Terms</h3>
          <p className="text-ink">{offer.compensationNote}</p>
          <p className="text-ink-2 mt-2">
            {supervisor
              ? `${supervisor.name} has confirmed supervision and will mentor you through delivery.`
              : "A faculty supervisor will be confirmed at kickoff."}
          </p>
          {offer.ndaRequired ? (
            <p className="text-meta text-warn mt-2">
              An NDA must be signed before the full brief and datasets are
              released.
            </p>
          ) : null}
        </div>
      </Section>

      <OfferFlow
        applicationId={application.id}
        challengeId={challenge.id}
        challengeTitle={challenge.title}
        orgName={orgName}
        offer={offer}
        posterContact={posterContact}
        fullBrief={fullBrief}
        resourceNames={resourceNames}
        expired={expired}
      />
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd className="font-semibold text-[15px] text-brand mt-1">{value}</dd>
    </div>
  );
}
