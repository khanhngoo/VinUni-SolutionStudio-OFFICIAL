import { cn } from "@/lib/cn";

interface StripedPlaceholderProps {
  className?: string;
  /** Monospace caption naming what belongs here, e.g. "ORG COVER". */
  label?: string;
}

export function StripedPlaceholder({
  className,
  label,
}: StripedPlaceholderProps) {
  return (
    <div
      className={cn(
        "stripes flex items-center justify-center font-mono text-[10px] tracking-[0.04em] text-ink-3/70",
        className,
      )}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
