import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface UnlockedBlockProps {
  title: string;
  /** What is now readable behind the block. */
  children: React.ReactNode;
  /** Staggers the reveal so the three blocks open in sequence, not at once. */
  delayMs?: number;
  animate?: boolean;
}

/**
 * The counterpart to LockedBlock: deliberately the same shape and rhythm so the
 * before/after reads as one component in two states rather than a different
 * panel appearing. This is the payoff the locked blocks have been promising.
 */
export function UnlockedBlock({
  title,
  children,
  delayMs = 0,
  animate = true,
}: UnlockedBlockProps) {
  return (
    <div
      className={cn(
        "bg-card border border-ok rounded-card overflow-hidden",
        animate && "reveal-block",
      )}
      style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line-2 bg-ok-soft">
        <span className="w-[18px] h-[18px] rounded-full bg-ok text-white grid place-items-center shrink-0">
          <CheckIcon className="w-2.5 h-2.5" />
        </span>
        <span className="font-semibold text-[12.5px] text-ok">{title}</span>
        <span className="text-meta text-ok/80 ml-auto">Unlocked</span>
      </div>
      <div className="p-4 text-ink-2">{children}</div>
    </div>
  );
}
