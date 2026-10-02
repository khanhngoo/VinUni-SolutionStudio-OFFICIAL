import { cn } from "@/lib/cn";

export type ChipVariant =
  | "default"
  | "accent"
  | "warn"
  | "ok"
  | "solid"
  | "outline-dashed"
  | "draft"
  | "neutral"
  | "danger"
  | "revise"
  | "live";

const variants: Record<ChipVariant, string> = {
  default: "bg-brand-soft text-brand font-medium",
  accent: "bg-accent-soft text-accent font-medium",
  warn: "bg-warn-soft text-warn font-medium",
  ok: "bg-ok-soft text-ok font-medium",
  solid: "bg-brand text-white font-medium",
  "outline-dashed": "border border-dashed border-line text-ink-3",
  // Status tones (see src/lib/status-tone.ts): ivory = not yet submitted,
  // grey = closed/withdrawn, red = negative outcome, pink = needs rework,
  // solid green = open/running right now.
  draft: "bg-draft-soft text-draft border border-draft-line font-medium",
  neutral: "bg-neutral-soft text-neutral font-medium",
  danger: "bg-red-soft text-red font-medium",
  revise: "bg-revise-soft text-revise font-medium",
  live: "bg-ok text-white font-medium",
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
