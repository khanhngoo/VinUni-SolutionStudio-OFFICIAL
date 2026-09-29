"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/cn";

/**
 * A form bound to a server action that returns an error message or null.
 * The page re-reads persisted state on success rather than assuming the
 * write landed, so a refused (stale, duplicate, closed) write stays visible.
 */
export function ActionForm({
  action,
  children,
  className,
  submitLabel,
  tone = "primary",
}: {
  action: (formData: FormData) => Promise<string | null>;
  children?: React.ReactNode;
  className?: string;
  submitLabel: string;
  tone?: "primary" | "ok" | "warn";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={cn("flex flex-col gap-2.5", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError(null);
        startTransition(async () => {
          const message = await action(data);
          if (message) {
            setError(message);
            return;
          }
          form.reset();
          router.refresh();
        });
      }}
    >
      {children}
      {error ? (
        <p role="alert" className="text-meta text-warn font-medium">
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "h-9 px-4 rounded-card font-semibold text-[13px] disabled:opacity-60",
            tone === "ok" && "bg-ok text-white hover:opacity-90",
            tone === "warn" && "border border-warn text-warn hover:bg-warn-soft",
            tone === "primary" && "bg-brand text-white hover:bg-brand-deep"
          )}
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
