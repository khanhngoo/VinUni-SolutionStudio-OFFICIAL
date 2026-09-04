"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StudentCard } from "@/components/partner/student-card";
import { ScoreDonut } from "@/components/ui/score-donut";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import { cn } from "@/lib/cn";
import type { Recommendation } from "@/lib/recommendations";
import { clampScore } from "@/lib/score";

export type Verdict = "invited" | "passed" | "saved";

const FILTERS = ["all", "invited", "saved", "passed"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "Everyone",
  invited: "Invited",
  saved: "Saved",
  passed: "Passed",
};

const VERDICT_LABELS: Record<Verdict, string> = {
  invited: "Invited",
  saved: "Saved",
  passed: "Passed",
};

interface DeckReviewProps {
  deck: Recommendation[];
  verdicts: Record<string, Verdict>;
  challengeTitle: string;
  onVerdict: (studentId: string, verdict: Verdict) => void;
  onRestart: () => void;
}

/**
 * What the deck was hiding: everyone, at once, still changeable.
 *
 * A one-at-a-time deck is a good instrument for a first pass and a bad one for
 * the second — you cannot compare two people you can no longer see, and a pass
 * made three cards ago is unreachable. So the far side of the deck is a list
 * and a detail pane, and every verdict here is still editable.
 */
export function DeckReview({
  deck,
  verdicts,
  challengeTitle,
  onVerdict,
  onRestart,
}: DeckReviewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(deck[0]?.student.id ?? "");
  const railRef = useRef<HTMLUListElement>(null);

  const shown = useMemo(
    () =>
      filter === "all"
        ? deck
        : deck.filter((rec) => verdicts[rec.student.id] === filter),
    [deck, verdicts, filter],
  );

  // Derived rather than stored, so a filter that hides the selected person
  // falls back to the top of the list without a correcting render.
  const selected =
    shown.find((rec) => rec.student.id === selectedId) ?? shown[0] ?? null;
  const selectedKey = selected?.student.id ?? "";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      event.preventDefault();
      const at = shown.findIndex((rec) => rec.student.id === selectedKey);
      const next = event.key === "ArrowDown" ? at + 1 : at - 1;
      const rec = shown[next];
      if (rec) setSelectedId(rec.student.id);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, selectedKey]);

  // Keep the keyboard-driven selection inside the scrolling rail.
  useEffect(() => {
    railRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  const counts = {
    invited: Object.values(verdicts).filter((v) => v === "invited").length,
    saved: Object.values(verdicts).filter((v) => v === "saved").length,
    passed: Object.values(verdicts).filter((v) => v === "passed").length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-ink">You have been through all {deck.length}</h2>
          <p className="text-ink-2 mt-1">
            {counts.invited} invited · {counts.saved} saved · {counts.passed}{" "}
            passed. Nothing is sent yet — change any of them here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            Swipe again
          </button>
          {counts.invited > 0 ? (
            <button
              type="button"
              className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
            >
              Send {counts.invited} invitation
              {counts.invited === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {FILTERS.map((f) => {
          const n =
            f === "all"
              ? deck.length
              : deck.filter((rec) => verdicts[rec.student.id] === f).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-card px-2.5 py-1 text-[11px] leading-none",
                filter === f
                  ? "bg-brand text-white font-medium"
                  : "border border-line text-ink-2 hover:border-brand hover:text-brand",
              )}
            >
              {FILTER_LABELS[f]}
              <span className={filter === f ? "text-white/70" : "text-ink-3"}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start mt-4">
        <ul
          ref={railRef}
          className="bg-card border border-line rounded-card overflow-y-auto max-h-[calc(100dvh-260px)] divide-y divide-line-2"
        >
          {shown.length === 0 ? (
            <li className="p-4 text-meta text-ink-3">
              Nobody in {FILTER_LABELS[filter].toLowerCase()}.
            </li>
          ) : (
            shown.map((rec) => {
              const active = rec.student.id === selectedKey;
              const verdict = verdicts[rec.student.id];
              return (
                <li key={rec.student.id}>
                  <button
                    type="button"
                    aria-current={active}
                    onClick={() => setSelectedId(rec.student.id)}
                    className={cn(
                      "w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-l-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
                      active
                        ? "bg-brand-soft border-l-brand"
                        : "border-l-transparent hover:bg-line-2/60",
                    )}
                  >
                    <StripedPlaceholder className="w-8 h-8 rounded-card shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {rec.student.name}
                      </span>
                      <span className="block truncate text-meta text-ink-3">
                        {verdict ? VERDICT_LABELS[verdict] : "No decision"} ·{" "}
                        {rec.fitBand}
                      </span>
                    </span>
                    <ScoreDonut
                      score={clampScore(rec.score)}
                      band={rec.fitBand}
                      size="sm"
                      showNumber={false}
                      label={`${clampScore(rec.score)} out of 100`}
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {selected ? (
          <div className="bg-card border border-line rounded-card p-5">
            <StudentCard rec={selected} challengeTitle={challengeTitle} />

            <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-line-2">
              {(["passed", "saved", "invited"] as const).map((v) => {
                const active = verdicts[selected.student.id] === v;
                const blocked =
                  v === "invited" && selected.student.liveChallenges >= 2;
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={blocked}
                    onClick={() => onVerdict(selected.student.id, v)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center justify-center h-9 px-4 rounded-card font-medium disabled:opacity-40 disabled:cursor-not-allowed",
                      active
                        ? v === "invited"
                          ? "bg-ok text-white font-semibold"
                          : "bg-brand text-white font-semibold"
                        : "border border-line text-ink-2 hover:border-brand hover:text-brand",
                    )}
                  >
                    {v === "passed"
                      ? "Pass"
                      : v === "saved"
                        ? "Save for later"
                        : "Invite to apply"}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-meta text-ink-3 mt-4">
        Nothing is saved — this demo keeps decisions in memory only.
      </p>
    </div>
  );
}
