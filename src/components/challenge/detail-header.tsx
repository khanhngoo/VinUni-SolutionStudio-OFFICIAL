import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import {
  challengeCompensationLabel,
  challengeDeadlineKey,
  challengeIsRedacted,
  challengeOrganizationLabel,
  challengeWorkModeLabel,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";
import { formatDate } from "@/lib/dates";

interface DetailHeaderProps {
  challenge: MarketplaceChallengeDetailModel;
}

export function DetailHeader({ challenge }: DetailHeaderProps) {
  const schools = challenge.eligibilitySummary.schools ?? [];

  return (
    <header>
      <nav className="text-meta text-ink-3 mb-3.5">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        {challenge.subtype ?? "Challenge"}
      </nav>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <Chip>{challenge.subtype ?? "Challenge"}</Chip>
        {schools.map((college) => (
          <Chip key={college}>{college}</Chip>
        ))}
        <Chip>{challengeWorkModeLabel(challenge)}</Chip>
        <Chip>{challengeCompensationLabel(challenge)}</Chip>
      </div>

      <h1>{challenge.title}</h1>

      <p className="text-ink-2 mt-2 flex items-center gap-1.5 flex-wrap">
        <span>{challengeOrganizationLabel(challenge)}</span>
        {challengeIsRedacted(challenge) ? (
          <span className="inline-flex items-center gap-1 text-ink-3 text-meta">
            <LockIcon className="w-3.5 h-3.5" />
            Organisation revealed after selection
          </span>
        ) : null}
      </p>
      <p className="text-meta text-ink-3 mt-1">
        Managed by {challenge.managingOrganization.displayName}
      </p>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
        <Stat
          label="Workload"
          value={
            challenge.weeklyHours === null
              ? "TBD"
              : `${challenge.weeklyHours} hrs / wk`
          }
        />
        <Stat
          label="Duration"
          value={
            challenge.durationWeeks === null
              ? "TBD"
              : `${challenge.durationWeeks} weeks`
          }
        />
        <Stat
          label="Starts"
          value={challenge.startDate ? formatDate(challenge.startDate) : "TBD"}
        />
        <Stat
          label="Applications close"
          value={
            challenge.applicationDeadline
              ? formatDate(challengeDeadlineKey(challenge))
              : "TBD"
          }
        />
      </dl>
    </header>
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
