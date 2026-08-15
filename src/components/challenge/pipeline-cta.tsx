import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ctaFor, STAGE_VARIANT } from "@/lib/pipeline";
import { deadlineLabel } from "@/lib/dates";
import { STAGE_LABELS, type Application } from "@/lib/types";

interface PipelineCtaProps {
  application: Application;
}

/**
 * The one thing the student can do next on this challenge, given where their
 * application sits. Switching in a single place keeps the detail page from
 * accumulating a branch per pipeline stage.
 */
export function PipelineCta({ application }: PipelineCtaProps) {
  const cta = ctaFor(application);

  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip variant={STAGE_VARIANT[application.stage]}>
              {STAGE_LABELS[application.stage]}
            </Chip>
            {application.nextActionDue ? (
              <span className="text-meta text-ink-3">
                {deadlineLabel(application.nextActionDue)}
              </span>
            ) : null}
          </div>
          <p className="font-semibold text-ink mt-2">
            {application.nextAction ?? "No action needed"}
          </p>
        </div>

        {cta ? (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {cta.label}
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
