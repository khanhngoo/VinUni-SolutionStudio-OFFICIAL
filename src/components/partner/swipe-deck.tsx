"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import { cn } from "@/lib/cn";
import type { Recommendation } from "@/lib/recommendations";
import { WEEKDAY_LABELS } from "@/lib/types";

type Verdict = "invited" | "passed" | "saved";

/**
 * The card deck.
 *
 * Decisions are local state and reset on reload — the same convention the
 * apply modal and the assessment runners follow, since v1 has no persistence
 * layer to write to.
 *
 * The pass action is undoable. A deck that discards a person on a single
 * keystroke with no way back is the wrong instrument for the decision being
 * made, however well it works for dating apps.
 */
export function SwipeDeck({
  deck,
  challengeTitle,
}: {
  deck: Recommendation[];
  challengeTitle: string;
}) {
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);

  const current = deck[index];
  const done = index >= deck.length;

  const decide = useCallback(
    (verdict: Verdict) => {
      const student = deck[index];
      if (!student) return;

      setVerdicts((prev) => ({ ...prev, [student.student.id]: verdict }));
      setLeaving(verdict === "passed" ? "left" : "right");

      // Long enough to read as a card leaving, short enough not to be a wait.
      window.setTimeout(() => {
        setLeaving(null);
        setIndex((i) => i + 1);
      }, 180);
    },
    [deck, index],
  );

  const undo = useCallback(() => {
    if (index === 0) return;
    const previous = deck[index - 1];
    setVerdicts((prev) => {
      const next = { ...prev };
      delete next[previous.student.id];
      return next;
    });
    setIndex((i) => i - 1);
  }, [deck, index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        decide("passed");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        decide("invited");
      } else if (event.key.toLowerCase() === "s") {
        decide("saved");
      } else if (event.key.toLowerCase() === "u") {
        undo();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo]);

  const invited = Object.values(verdicts).filter((v) => v === "invited").length;
  const saved = Object.values(verdicts).filter((v) => v === "saved").length;
  const passed = Object.values(verdicts).filter((v) => v === "passed").length;

  if (done) {
    return (
      <div className="bg-card border border-line rounded-card p-8 text-center">
        <p className="font-semibold text-ink">You have been through all ten</p>
        <p className="text-ink-2 mt-1.5">
          {invited} invited to apply · {saved} saved · {passed} passed.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setVerdicts({});
            }}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            Start over
          </button>
          {invited > 0 ? (
            <button
              type="button"
              className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
            >
              Send {invited} invitation{invited === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
        <p className="text-meta text-ink-3 mt-5">
          Nothing is saved — this demo keeps decisions in memory only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-meta text-ink-3">
          {index + 1} of {deck.length}
        </span>
        <span className="flex items-center gap-3">
          {invited > 0 ? (
            <span className="text-meta text-ok font-medium">{invited} invited</span>
          ) : null}
          {saved > 0 ? (
            <span className="text-meta text-ink-3">{saved} saved</span>
          ) : null}
          {passed > 0 ? (
            <span className="text-meta text-ink-3">{passed} passed</span>
          ) : null}
        </span>
      </div>

      <div className="relative">
        {/* The two cards behind, so the deck reads as a stack with depth. */}
        {deck[index + 2] ? (
          <div
            aria-hidden
            className="absolute inset-x-3 top-3.5 h-full bg-card border border-line rounded-card opacity-40"
          />
        ) : null}
        {deck[index + 1] ? (
          <div
            aria-hidden
            className="absolute inset-x-1.5 top-1.5 h-full bg-card border border-line rounded-card opacity-70"
          />
        ) : null}

        <div
          className={cn(
            "relative bg-card border border-line rounded-card p-5 transition-all duration-150",
            leaving === "left" && "-translate-x-6 opacity-0",
            leaving === "right" && "translate-x-6 opacity-0",
          )}
        >
          <StudentCard rec={current} challengeTitle={challengeTitle} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
        <button
          type="button"
          onClick={() => decide("passed")}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-ink-3 hover:text-ink"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => decide("saved")}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
        >
          Save for later
        </button>
        <button
          type="button"
          onClick={() => decide("invited")}
          disabled={current.student.liveChallenges >= 2}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-ok text-white font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Invite to apply
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
        <Key label="←" note="pass" />
        <Key label="→" note="invite" />
        <Key label="S" note="save" />
        <button
          type="button"
          onClick={undo}
          disabled={index === 0}
          className="text-meta text-ink-3 hover:text-brand disabled:opacity-40 disabled:hover:text-ink-3"
        >
          <span className="font-mono border border-line border-b-2 rounded-[3px] px-1.5 py-0.5 mr-1.5">
            U
          </span>
          undo
        </button>
      </div>
    </div>
  );
}

function Key({ label, note }: { label: string; note: string }) {
  return (
    <span className="text-meta text-ink-3">
      <span className="font-mono border border-line border-b-2 rounded-[3px] px-1.5 py-0.5 mr-1.5">
        {label}
      </span>
      {note}
    </span>
  );
}

function StudentCard({
  rec,
  challengeTitle,
}: {
  rec: Recommendation;
  challengeTitle: string;
}) {
  const { student } = rec;
  const atCapacity = student.liveChallenges >= 2;

  return (
    <>
      <div className="flex gap-3.5">
        <StripedPlaceholder className="w-[52px] h-[52px] rounded-card shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink">{student.name}</h2>
            <Chip variant={bandVariant(rec.fitBand)}>{rec.fitBand} fit</Chip>
            {atCapacity ? <Chip variant="warn">At capacity</Chip> : null}
          </div>
          <p className="text-meta text-ink-3 mt-1">
            {student.major} · Year {student.year} · {student.college} ·{" "}
            {student.hoursAvailable} hrs/wk
          </p>
        </div>
      </div>

      {student.about ? (
        <p className="text-ink-2 mt-3.5 leading-relaxed">{student.about}</p>
      ) : null}

      <div className="flex flex-wrap gap-1.5 mt-3.5">
        {student.skills.map((skill) => (
          <Chip
            key={skill}
            variant={
              rec.matchedSkills.includes(skill) ? "default" : "outline-dashed"
            }
          >
            {skill}
          </Chip>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-line-2">
        <h3 className="text-h3 text-ink-3">Why this match</h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {rec.reasons.map((reason) => (
            <li key={reason} className="text-ink-2 flex gap-2 leading-relaxed">
              <span aria-hidden className="text-ok shrink-0">
                ✓
              </span>
              {reason}
            </li>
          ))}
        </ul>

        {rec.caveats.length > 0 ? (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {rec.caveats.map((caveat) => (
              <li
                key={caveat}
                className="text-ink-3 flex gap-2 leading-relaxed text-meta"
              >
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                {caveat}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {student.pinnedCourses.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-line-2">
          <h3 className="text-h3 text-ink-3">Showcased coursework</h3>
          <div className="flex flex-col gap-1.5 mt-2">
            {student.pinnedCourses.map((course) => (
              <div
                key={course.code}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-ink-2 min-w-0 truncate">
                  {course.title}{" "}
                  <span className="text-ink-3 text-meta">({course.code})</span>
                </span>
                <span className="font-semibold text-brand shrink-0">
                  {course.grade}
                </span>
              </div>
            ))}
          </div>
          <p className="text-meta text-ink-3 mt-2">
            Chosen by the student. Their GPA and full transcript stay private.
          </p>
        </div>
      ) : null}

      <div className="mt-4 pt-4 border-t border-line-2 grid sm:grid-cols-2 gap-3">
        <div>
          <h3 className="text-h3 text-ink-3">Assessment</h3>
          <p className="text-ink font-medium mt-1">
            {student.assessmentBand ?? "Not assessed yet"}
          </p>
        </div>
        <div>
          <h3 className="text-h3 text-ink-3">Typical week</h3>
          <div className="flex gap-1 mt-1.5">
            {student.weeklyAvailability.map((day, i) => (
              <span
                key={i}
                title={day}
                className={cn(
                  "w-5 h-5 rounded-[3px] grid place-items-center text-[9px] font-semibold",
                  day === "free" && "bg-ok-soft text-ok",
                  day === "partly" && "bg-warn-soft text-warn",
                  day === "busy" && "bg-line-2 text-ink-3",
                )}
              >
                {WEEKDAY_LABELS[i]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-meta text-ink-3 mt-4">
        Matched against {challengeTitle}.
      </p>
    </>
  );
}

function bandVariant(band: Recommendation["fitBand"]) {
  if (band === "Strong") return "ok" as const;
  if (band === "Proficient") return "accent" as const;
  return "outline-dashed" as const;
}
