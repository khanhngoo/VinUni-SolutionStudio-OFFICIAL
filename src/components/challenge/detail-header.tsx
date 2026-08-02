import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { LockIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/dates";
import type { Challenge } from "@/lib/types";

interface DetailHeaderProps {
  challenge: Challenge;
}

export function DetailHeader({ challenge }: DetailHeaderProps) {
  return (
    <header>
      <nav className="text-meta text-ink-3 mb-3.5">
        <Link href="/challenges">Challenges</Link>
        <span className="mx-1.5">›</span>
        {challenge.subType}
      </nav>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <Chip>{challenge.subType}</Chip>
        {challenge.colleges.map((college) => (
          <Chip key={college}>{college}</Chip>
        ))}
        <Chip>{challenge.workMode}</Chip>
        <Chip>{challenge.compensation}</Chip>
      </div>

      <h1>{challenge.title}</h1>

      <p className="text-ink-2 mt-2 flex items-center gap-1.5 flex-wrap">
        <span>{challenge.orgName ?? challenge.orgCategory}</span>
        {challenge.confidential ? (
          <span className="inline-flex items-center gap-1 text-ink-3 text-meta">
            <LockIcon className="w-3.5 h-3.5" />
            Organisation revealed after selection
          </span>
        ) : null}
      </p>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
        <Stat label="Workload" value={`${challenge.hoursPerWeek} hrs / wk`} />
        <Stat label="Duration" value={`${challenge.durationWeeks} weeks`} />
        <Stat label="Starts" value={formatDate(challenge.startDate)} />
        <Stat label="Applications close" value={formatDate(challenge.deadline)} />
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
