"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { saveFacultyProfile } from "./actions";

const FIELD_BASE =
  "w-full border border-line rounded-card bg-card px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function FacultyProfileEditForm({
  maxActiveSupervisions,
}: {
  maxActiveSupervisions: number | null;
}) {
  const [value, setValue] = useState(String(maxActiveSupervisions ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const message = await saveFacultyProfile({ maxActiveSupervisions: Number(value) });
      if (message) setError(message);
    });
  }

  return (
    <div className="max-w-[560px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/faculty/profile">Faculty profile</Link>
        <span className="mx-1.5">›</span>
        Edit
      </nav>

      <div className="flex items-center justify-between gap-4 mt-3.5">
        <h1>Edit supervision capacity</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/faculty/profile"
            className="inline-flex items-center h-9 px-4 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2">
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-meta text-ink-3 uppercase tracking-[0.07em]">
          Active supervisions at once
        </p>
        <div className="mt-1.5">
          <input
            type="number"
            min={0}
            max={50}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={cn(FIELD_BASE, "h-9")}
          />
        </div>
        <p className="text-meta text-ink-3 mt-1.5">
          How many active supervisions you are willing to take on at the same time.
        </p>
      </div>
    </div>
  );
}
