"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BlockedActionToast,
  DesktopOnlyNotice,
  LockdownHeader,
  SubmitConfirm,
  WarningOverlay,
} from "@/components/assessment/lockdown-chrome";
import { useLockdown } from "@/components/assessment/use-lockdown";
import { cn } from "@/lib/cn";
import { cognitiveSections } from "@/lib/data/assessment";

interface CognitiveRunnerProps {
  applicationId: string;
  challengeTitle: string;
}

/**
 * PRD §8.2: one question per view, back-navigation allowed within a section but
 * never between sections, per-section timers, section interstitials.
 */
export function CognitiveRunner({
  applicationId,
  challengeTitle,
}: CognitiveRunnerProps) {
  const router = useRouter();

  const totalSeconds = useMemo(
    () => cognitiveSections.reduce((n, s) => n + s.minutes, 0) * 60,
    [],
  );
  const flatCount = useMemo(
    () => cognitiveSections.reduce((n, s) => n + s.questions.length, 0),
    [],
  );

  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showInterstitial, setShowInterstitial] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lockdown = useLockdown({
    totalSeconds,
    onAutoSubmit: () => router.replace(`/assessment/${applicationId}/result`),
  });

  const {
    requestFullscreen,
    blockAction,
    markSaved,
    exitFullscreen,
    markFinished,
  } = lockdown;

  // Enter fullscreen once the student dismisses the first interstitial — a
  // request outside a user gesture is rejected by the browser.
  useEffect(() => {
    return () => exitFullscreen();
  }, [exitFullscreen]);

  // Block copy/paste/context-menu in the question area (PRD §8.4).
  useEffect(() => {
    function block(event: Event) {
      event.preventDefault();
      blockAction("Copying is disabled during the assessment.");
    }
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [blockAction]);

  const section = cognitiveSections[sectionIndex];
  const question = section.questions[questionIndex];
  const answeredCount = Object.keys(answers).length;

  const questionNumber =
    cognitiveSections
      .slice(0, sectionIndex)
      .reduce((n, s) => n + s.questions.length, 0) + questionIndex + 1;

  function choose(optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));
    markSaved();
  }

  function goNext() {
    if (questionIndex < section.questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    if (sectionIndex < cognitiveSections.length - 1) {
      setSectionIndex(sectionIndex + 1);
      setQuestionIndex(0);
      setShowInterstitial(true);
      return;
    }
    setConfirmOpen(true);
  }

  function submit() {
    markFinished();
    exitFullscreen();
    router.replace(`/assessment/${applicationId}/result`);
  }

  return (
    <>
      <DesktopOnlyNotice />

      <div className="hidden lg:flex flex-col min-h-dvh bg-paper">
        <LockdownHeader
          challengeTitle={challengeTitle}
          progress={`${questionNumber} of ${flatCount}`}
          secondsLeft={lockdown.secondsLeft}
          totalSeconds={totalSeconds}
          violations={lockdown.violations}
          violationLimit={lockdown.violationLimit}
          savedAt={lockdown.savedAt}
          onSubmit={() => setConfirmOpen(true)}
        />

        {showInterstitial ? (
          <div className="flex-1 grid place-items-center px-6">
            <div className="text-center max-w-[46ch]">
              <p className="text-meta text-ink-3">
                Section {sectionIndex + 1} of {cognitiveSections.length}
              </p>
              <h1 className="mt-2">{section.name}</h1>
              <p className="text-ink-2 mt-2">
                {section.questions.length} questions · {section.minutes} minutes
                suggested. You can move back and forward within this section, but
                not return to it once you move on.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowInterstitial(false);
                  requestFullscreen();
                }}
                className="h-10 px-5 mt-6 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Begin section
              </button>
            </div>
          </div>
        ) : (
          <main className="flex-1 w-full max-w-[760px] mx-auto px-6 py-10 select-none">
            <p className="text-meta text-ink-3">
              {section.name} · question {questionIndex + 1} of{" "}
              {section.questions.length}
            </p>

            <h2 className="text-[17px] leading-snug mt-3">{question.prompt}</h2>

            <fieldset className="mt-6 flex flex-col gap-2.5">
              <legend className="sr-only">{question.prompt}</legend>
              {question.options.map((option, index) => {
                const selected = answers[question.id] === index;
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 rounded-card border cursor-pointer bg-card transition-colors",
                      selected
                        ? "border-brand ring-1 ring-brand"
                        : "border-line hover:border-ink-3",
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected}
                      onChange={() => choose(index)}
                      className="mt-0.5 w-[15px] h-[15px] shrink-0 accent-[var(--color-brand)]"
                    />
                    <span className="text-ink">{option}</span>
                  </label>
                );
              })}
            </fieldset>

            <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-line">
              <button
                type="button"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex(questionIndex - 1)}
                className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-meta text-ink-3">
                {answeredCount} of {flatCount} answered
              </span>
              <button
                type="button"
                onClick={goNext}
                className="h-9 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
              >
                {questionIndex === section.questions.length - 1 &&
                sectionIndex === cognitiveSections.length - 1
                  ? "Finish"
                  : "Next"}
              </button>
            </div>
          </main>
        )}
      </div>

      <WarningOverlay
        warning={lockdown.warning}
        violationLimit={lockdown.violationLimit}
        onDismiss={lockdown.dismissWarning}
        onReturnToFullscreen={requestFullscreen}
      />
      <SubmitConfirm
        open={confirmOpen}
        unanswered={flatCount - answeredCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
      <BlockedActionToast message={lockdown.toast} />
    </>
  );
}
