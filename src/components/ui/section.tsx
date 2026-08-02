import { cn } from "@/lib/cn";

interface SectionProps {
  title: string;
  /** Optional right-aligned note, e.g. a match count. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** The vertical rhythm unit of the detail page: eyebrow heading + content. */
export function Section({ title, aside, className, children }: SectionProps) {
  return (
    <section className={cn("mt-7", className)}>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="marker-triangle text-brand">{title}</h2>
        {aside ? <span className="text-meta text-ink-3">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}
