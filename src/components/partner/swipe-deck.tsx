"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { DeckReview, type Verdict } from "@/components/partner/deck-review";
import { StudentCard } from "@/components/partner/student-card";
import { cn } from "@/lib/cn";
import type { Recommendation } from "@/lib/recommendations";

/** Past this, letting go commits — below it, the card springs back. */
const COMMIT_DISTANCE = 120;
/** A flick counts even when it never travelled far. */
const COMMIT_VELOCITY = 500;

/**
 * The card deck.
 *
 * Decisions are local state and reset on reload — the same convention the
 * assessment runners follow, since v1 has no persistence layer to write to.
 *
 * Dragging, the buttons and the arrow keys all funnel through `decide`, so the
 * gesture is an extra way in rather than a second code path. The pass action
 * stays undoable, and the far side of the deck is a review pane rather than a
 * dead end: a deck that discards a person on a single gesture with no way back
 * is the wrong instrument for the decision being made, however well it works
 * for dating apps.
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
  const reduce = useReducedMotion();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-9, 0, 9]);
  const likeOpacity = useTransform(x, [40, 160], [0, 1]);
  const nopeOpacity = useTransform(x, [-160, -40], [1, 0]);
  /**
   * Which way the leaving card flies: -1 pass, 1 invite, 0 for an undo, where
   * it should fall back rather than continue. State rather than a ref because
   * the exit transition is rendered, not imperative.
   */
  const [exitDir, setExitDir] = useState(0);

  const current = deck[index];
  const done = index >= deck.length;

  const decide = useCallback(
    (verdict: Verdict) => {
      const rec = deck[index];
      if (!rec) return;

      setExitDir(verdict === "passed" ? -1 : 1);
      setVerdicts((prev) => ({ ...prev, [rec.student.id]: verdict }));
      setIndex((i) => i + 1);
    },
    [deck, index],
  );

  const undo = useCallback(() => {
    if (index === 0) return;
    const previous = deck[index - 1];
    setExitDir(0);
    setVerdicts((prev) => {
      const next = { ...prev };
      delete next[previous.student.id];
      return next;
    });
    setIndex((i) => i - 1);
  }, [deck, index]);

  // The next card arrives centred however the last one left.
  useEffect(() => {
    x.set(0);
  }, [index, x]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const far = Math.abs(info.offset.x) > COMMIT_DISTANCE;
      const fast = Math.abs(info.velocity.x) > COMMIT_VELOCITY;
      if (!far && !fast) return; // dragElastic springs it home on its own

      const right = info.offset.x > 0;
      if (right && deck[index]?.student.liveChallenges >= 2) return;
      decide(right ? "invited" : "passed");
    },
    [decide, deck, index],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

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
      <DeckReview
        deck={deck}
        verdicts={verdicts}
        challengeTitle={challengeTitle}
        onVerdict={(studentId, verdict) =>
          setVerdicts((prev) => ({ ...prev, [studentId]: verdict }))
        }
        onRestart={() => {
          setIndex(0);
          setVerdicts({});
        }}
      />
    );
  }

  // The deck stays a narrow column; only the review pane earns the full width.
  return (
    <div className="max-w-[720px] mx-auto">
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

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.student.id}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.55}
            onDragEnd={onDragEnd}
            style={reduce ? undefined : { x, rotate }}
            initial={reduce ? false : { scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    x: exitDir * 420,
                    opacity: 0,
                    transition: { duration: 0.22 },
                  }
            }
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className={cn(
              "relative bg-card border border-line rounded-card p-5",
              !reduce && "cursor-grab active:cursor-grabbing touch-pan-y",
            )}
          >
            {!reduce ? (
              <>
                <motion.span
                  aria-hidden
                  style={{ opacity: likeOpacity }}
                  className="absolute top-4 right-4 z-10 rotate-12 rounded-card border-2 border-ok px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider text-ok"
                >
                  Invite
                </motion.span>
                <motion.span
                  aria-hidden
                  style={{ opacity: nopeOpacity }}
                  className="absolute top-4 left-4 z-10 -rotate-12 rounded-card border-2 border-ink-3 px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider text-ink-3"
                >
                  Pass
                </motion.span>
              </>
            ) : null}

            <StudentCard rec={current} challengeTitle={challengeTitle} />
          </motion.div>
        </AnimatePresence>
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

      {!reduce ? (
        <p className="text-meta text-ink-3 text-center mt-2.5">
          Or drag the card left to pass, right to invite.
        </p>
      ) : null}
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
