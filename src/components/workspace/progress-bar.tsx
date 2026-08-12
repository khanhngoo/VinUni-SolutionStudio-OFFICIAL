import { cn } from "@/lib/cn";

interface ProgressBarProps {
  approved: number;
  total: number;
  className?: string;
}

/** Milestone completion, shared by the hub cards and the project header. */
export function ProgressBar({ approved, total, className }: ProgressBarProps) {
  const percent = total === 0 ? 0 : (approved / total) * 100;

  return (
    <div
      className={cn("h-1.5 rounded-full bg-line-2 overflow-hidden", className)}
    >
      <div
        className="h-full bg-ok rounded-full"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
