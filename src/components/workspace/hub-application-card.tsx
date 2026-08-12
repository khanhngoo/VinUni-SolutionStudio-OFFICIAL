import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { daysInStage, STAGE_VARIANT } from "@/lib/pipeline";
import type { ApplicationWithChallenge } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/types";
import { hubCtaFor, milestoneProgress } from "@/lib/workspace";

/** One application, as it appears in a hub group. */
export function HubApplicationCard({
  application,
  challenge,
}: ApplicationWithChallenge) {
  const cta = hubCtaFor({ application, challenge });
  const days = daysInStage(application);
  const progress = application.project
    ? milestoneProgress(application.project)
    : null;

  return (
    <article className="bg-card border border-line rounded-card p-5 flex flex-col">
      <div className="flex items-center gap-2 flex-wrap">
        <Chip variant={STAGE_VARIANT[application.stage]}>
          {STAGE_LABELS[application.stage]}
        </Chip>
        <span className="text-meta text-ink-3">
          {days} day{days === 1 ? "" : "s"} in this stage
        </span>
      </div>

      <h3 className="text-ink normal-case tracking-normal text-[15px] font-semibold mt-2.5">
        <Link href={`/challenges/${challenge.id}`}>{challenge.title}</Link>
      </h3>
      <p className="text-meta text-ink-3 mt-0.5">
        {challenge.orgName ?? challenge.orgCategory} · {challenge.subType}
      </p>

      {progress ? (
        <div className="mt-3.5">
          <ProgressBar approved={progress.approved} total={progress.total} />
          <p className="text-meta text-ink-3 mt-1.5">
            {progress.approved} of {progress.total} milestones approved
          </p>
        </div>
      ) : null}

      {application.nextAction ? (
        <p className="text-ink-2 mt-3">{application.nextAction}</p>
      ) : null}

      <Link
        href={cta.href}
        className="inline-flex items-center gap-1.5 self-start mt-4 text-brand font-semibold hover:text-brand-deep"
      >
        {cta.label}
        <ChevronRightIcon className="w-3.5 h-3.5" />
      </Link>
    </article>
  );
}
