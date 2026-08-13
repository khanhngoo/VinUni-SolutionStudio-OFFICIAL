import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { cn } from "@/lib/cn";
import { STAGE_VARIANT } from "@/lib/pipeline";
import type { ApplicationWithChallenge } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/types";
import { hubCtaFor, hubDueFor, milestoneProgress } from "@/lib/workspace";

interface HubApplicationTableProps {
  rows: ApplicationWithChallenge[];
  /** Live projects trade the stage chip for milestone progress. */
  showProgress?: boolean;
}

/**
 * One group of applications as table rows. Denser than a card grid, which
 * matters once a student is carrying eleven of them.
 */
export function HubApplicationTable({
  rows,
  showProgress = false,
}: HubApplicationTableProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row) => {
          const { application, challenge } = row;
          const cta = hubCtaFor(row);
          const due = hubDueFor(row);
          const progress =
            showProgress && application.project
              ? milestoneProgress(application.project)
              : null;

          return (
            <tr
              key={application.id}
              className="border-b border-line-2 last:border-b-0"
            >
              <td className="py-2.5 pr-3 align-middle">
                <Link
                  href={`/challenges/${challenge.id}`}
                  className="font-medium text-ink hover:text-brand"
                >
                  {challenge.title}
                </Link>
                <p className="text-meta text-ink-3 mt-0.5">
                  {challenge.orgName ?? challenge.orgCategory}
                </p>
              </td>

              <td className="py-2.5 pr-3 align-middle w-[132px]">
                {progress ? (
                  <span className="flex items-center gap-2">
                    <ProgressBar
                      approved={progress.approved}
                      total={progress.total}
                      className="w-[58px]"
                    />
                    <span className="text-meta text-ink-3">
                      {progress.approved}/{progress.total}
                    </span>
                  </span>
                ) : (
                  <Chip variant={STAGE_VARIANT[application.stage]}>
                    {STAGE_LABELS[application.stage]}
                  </Chip>
                )}
              </td>

              <td className="py-2.5 pr-3 align-middle w-[104px] text-right">
                <span
                  className={cn(
                    "text-meta whitespace-nowrap",
                    due?.urgent ? "text-warn font-medium" : "text-ink-3",
                  )}
                >
                  {due ? due.label : "—"}
                </span>
              </td>

              <td className="py-2.5 align-middle w-[76px] text-right">
                <Link
                  href={cta.href}
                  className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                >
                  {cta.label} →
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
