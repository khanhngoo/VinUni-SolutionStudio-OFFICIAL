"use client";

import Link from "next/link";

interface ChallengesErrorProps {
  reset: () => void;
}

export default function ChallengesError({ reset }: ChallengesErrorProps) {
  return (
    <div className="max-w-[520px] mx-auto px-6 py-24 text-center">
      <h1>Challenge data is unavailable</h1>
      <p className="text-ink-2 mt-2.5">
        The marketplace could not load from the database. Please try again in a
        moment.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 mt-6">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
        >
          Try again
        </button>
        <Link
          href="/challenges"
          className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-brand font-semibold hover:border-brand"
        >
          Reset filters
        </Link>
      </div>
    </div>
  );
}
