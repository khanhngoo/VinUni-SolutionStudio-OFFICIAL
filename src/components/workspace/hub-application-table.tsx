import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/workspace/progress-bar";
import { cn } from "@/lib/cn";
import { deadlineLabel, isUrgent } from "@/lib/dates";
import { ctaForView, STAGE_VARIANT } from "@/lib/pipeline";
import { STAGE_LABELS } from "@/lib/types";
import type { WorkspaceHubRow } from "@/services/workspace-hub.service";

interface HubApplicationTableProps {
  rows: WorkspaceHubRow[];
  /** Live projects trade the stage chip for milestone progress. */
  showProgress?: boolean;
}

/**
 * One group of applications as table rows. Denser than a card grid, which
 * matters once a student is carrying a dozen of them.
 */
export function HubApplicationTable({
  rows,
  showProgress = false,
}: HubApplicationTableProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row) => {
          const cta = ctaForView({
            nextAction: null,
            nextActionDue: row.nextActionDue,
            offerRespondBy: null,
            publicId: row.publicId,
            stage: row.stage,
          });
          const progress = showProgress ? row.progress : null;
          const urgent = row.nextActionDue
            ? isUrgent(row.nextActionDue)
            : false;

          return (
            <tr
              key={row.publicId}
              className="border-b border-line-2 last:border-b-0"
            >
              <td className="py-2.5 pr-3 align-middle">
                <Link
                  href={`/challenges/${row.challengeSlug}`}
                  className="font-medium text-ink hover:text-brand"
                >
                  {row.challengeTitle}
                </Link>
                <p className="text-meta text-ink-3 mt-0.5">
                  {row.ownerOrganizationName}
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
                  <Chip variant={STAGE_VARIANT[row.stage]}>
                    {STAGE_LABELS[row.stage]}
                  </Chip>
                )}
              </td>

              <td className="py-2.5 pr-3 align-middle w-[104px] text-right">
                <span
                  className={cn(
                    "text-meta whitespace-nowrap",
                    urgent ? "text-warn font-medium" : "text-ink-3"
                  )}
                >
                  {row.nextActionDue ? deadlineLabel(row.nextActionDue) : "—"}
                </span>
              </td>

              <td className="py-2.5 align-middle w-[76px] text-right">
                <Link
                  href={cta?.href ?? `/challenges/${row.challengeSlug}`}
                  className="text-meta font-semibold text-brand hover:text-brand-deep whitespace-nowrap"
                >
                  {cta?.label ?? "View"} →
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
