import { cn } from "@/lib/cn";

export type ChipVariant =
  | "default"
  | "accent"
  | "warn"
  | "ok"
  | "solid"
  | "outline-dashed";

const variants: Record<ChipVariant, string> = {
  default: "bg-brand-soft text-brand font-medium",
  accent: "bg-accent-soft text-accent font-medium",
  warn: "bg-warn-soft text-warn font-medium",
  ok: "bg-ok-soft text-ok font-medium",
  solid: "bg-brand text-white font-medium",
  "outline-dashed": "border border-dashed border-line text-ink-3",
};

interface ChipProps {
  variant?: ChipVariant;
  className?: string;
  children: React.ReactNode;
}

export function Chip({
  variant = "default",
  className,
  children,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-card px-2.5 py-1 text-[11px] leading-none whitespace-nowrap",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
