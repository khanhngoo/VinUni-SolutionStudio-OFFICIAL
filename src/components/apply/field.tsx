"use client";

/**
 * The labelled field the apply steps share — label, optional hint, error under
 * the control. Lifted out of the old apply modal, which was the only place it
 * existed while the wizard had nowhere to put a form.
 */
export function Field({
  label,
  hint,
  hintTone = "muted",
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "muted" | "warn";
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label htmlFor={htmlFor} className="font-semibold text-ink">
          {label}
        </label>
        {hint ? (
          <span
            className={
              hintTone === "warn" ? "text-meta text-warn" : "text-meta text-ink-3"
            }
          >
            {hint}
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-meta text-warn mt-1.5">{error}</p> : null}
    </div>
  );
}

export function inputClass(hasError: boolean): string {
  return [
    "w-full rounded-card border bg-paper px-3 py-2 text-ink",
    "placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
    hasError ? "border-warn" : "border-line",
  ].join(" ");
}
