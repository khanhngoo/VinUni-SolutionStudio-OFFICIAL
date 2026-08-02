import { cn } from "@/lib/cn";

/**
 * The pipeline as the cross-role swimlane diagram draws it (phases 3–5). There
 * is no faculty-approval gate on the student's application — faculty review the
 * challenge and the test, not the applicant — so the nodes run straight from
 * shortlisting to the test.
 */
const NODES = [
  { label: "Applied", note: "You submit" },
  { label: "Shortlisted", note: "Partner reviews" },
  { label: "Test", note: "7-day window" },
  { label: "Interview", note: "~1 week" },
  { label: "Decision", note: "≤5 days" },
  { label: "Kickoff", note: "You accept" },
];

interface SelectionTimelineProps {
  /** -1 before applying (every node reads as a preview of the process). */
  currentNodeIndex: number;
}

export function SelectionTimeline({ currentNodeIndex }: SelectionTimelineProps) {
  return (
    <ol className="flex items-start">
      {NODES.map((node, index) => {
        const done = index <= currentNodeIndex;
        const now = index === currentNodeIndex + 1 && currentNodeIndex >= 0;

        return (
          <li
            key={node.label}
            className="relative flex-1 flex flex-col items-center gap-1.5 text-center"
          >
            {index > 0 ? (
              <span
                className={cn(
                  "absolute top-[9px] right-1/2 w-full h-[1.5px]",
                  done ? "bg-ok" : "bg-line",
                )}
                aria-hidden="true"
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 w-[18px] h-[18px] rounded-full border-[1.5px] grid place-items-center",
                done && "bg-ok border-ok",
                now && "bg-card border-2 border-accent ring-[3px] ring-accent-soft",
                !done && !now && "bg-card border-line",
              )}
            >
              {done ? (
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              ) : null}
            </span>

            <span
              className={cn(
                "text-[10.5px] leading-tight max-w-[74px]",
                done && "text-ink-2",
                now && "text-accent font-semibold",
                !done && !now && "text-ink-3",
              )}
            >
              {node.label}
            </span>
            <span className="text-[10px] leading-tight text-ink-3">
              {now ? "In progress" : node.note}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
