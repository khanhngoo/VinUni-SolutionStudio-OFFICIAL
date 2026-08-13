import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The system's verification mark. It attests to one thing only — that the
 * data came from the registrar — so it must never appear beside anything a
 * student typed about themselves. `SelfReported` is its counterpart.
 */
export function VerifiedMark({
  children = "Registrar",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta text-ok whitespace-nowrap",
        className,
      )}
    >
      <span className="w-3.5 h-3.5 rounded-full bg-ok text-white grid place-items-center shrink-0">
        <CheckIcon className="w-2 h-2" />
      </span>
      {children}
    </span>
  );
}

/** The student's own claim. Dashed, muted — visibly not the same thing. */
export function SelfReported({
  children = "Self-reported",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-card border border-dashed border-line px-2 py-1 text-[11px] leading-none text-ink-3 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}
