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
import type {
  AssessmentResponseInput,
  AssessmentStudentQuestion,
} from "@/services/assessment.service";

interface TechnicalRunnerProps {
  applicationId: string;
  challengeTitle: string;
  expiresAt: string | null;
  minutes: number | null;
  problems: AssessmentStudentQuestion[];
  responses: Record<string, AssessmentResponseInput>;
  submitAction: (
    responses: Record<string, AssessmentResponseInput>
  ) => Promise<void>;
  saveResponseAction: (
    questionKey: string,
    response: AssessmentResponseInput
  ) => Promise<void>;
}

/**
 * PRD §8.3: three panes — statement, editor, and review guidance. The editor is
 * a plain textarea. Phase 6.6 does not execute candidate code; coding answers
 * are saved for manual faculty review.
 */
export function TechnicalRunner({
  applicationId,
  challengeTitle,
  expiresAt,
  minutes,
  problems,
  responses,
  submitAction,
  saveResponseAction,
}: TechnicalRunnerProps) {
  const router = useRouter();
  const totalSeconds = minutes === null ? null : minutes * 60;

  const [problemIndex, setProblemIndex] = useState(0);
  const [code, setCode] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      problems.map((p) => [
        p.questionKey,
        savedCodeFor(p, responses),
      ]),
    ),
  );
  const [outputOpen, setOutputOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [started, setStarted] = useState(false);

  const lockdown = useLockdown({
    expiresAt,
    totalSeconds,
    onAutoSubmit: () => {
      void submit();
    },
  });

  const {
    requestFullscreen,
    blockAction,
    markSaved,
    exitFullscreen,
    markFinished,
  } = lockdown;

  useEffect(() => {
    return () => exitFullscreen();
  }, [exitFullscreen]);

  // Copy/paste stays enabled inside the editor, blocked everywhere else.
  useEffect(() => {
    function block(event: Event) {
      const target = event.target as HTMLElement | null;
      if (target?.dataset.editor === "true") return;
      event.preventDefault();
      blockAction("Copying is disabled outside the editor.");
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

  const problem = problems[problemIndex];
  const currentCode = code[problem.questionKey] ?? "";
  const attempted = useMemo(
    () =>
      problems.filter((p) => {
        const written = code[p.questionKey]
          .replace(p.coding?.starterCode ?? "", "")
          .trim();
        return written.length > 0;
      }).length,
    [code, problems],
  );

  useEffect(() => {
    if (!started || !hasStudentCode(problem, currentCode)) return;
    const timeout = window.setTimeout(() => {
      void saveResponseAction(problem.questionKey, {
        kind: "CODING",
        code: currentCode,
      }).then(markSaved);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [currentCode, markSaved, problem, saveResponseAction, started]);

  async function saveCurrentProblem() {
    if (!hasStudentCode(problem, code[problem.questionKey] ?? "")) return;
    const response = {
      kind: "CODING",
      code: code[problem.questionKey] ?? "",
    } satisfies AssessmentResponseInput;
    await saveResponseAction(problem.questionKey, response);
    markSaved();
  }

  async function submit() {
    markFinished();
    await submitAction(
      Object.fromEntries(
        problems.flatMap((p) =>
          hasStudentCode(p, code[p.questionKey] ?? "")
            ? [[
                p.questionKey,
                {
                  kind: "CODING",
                  code: code[p.questionKey] ?? "",
                } satisfies AssessmentResponseInput,
              ]]
            : [],
        ),
      ),
    );
    exitFullscreen();
    router.replace(`/assessment/${applicationId}/result`);
  }

  if (!started) {
    return (
      <>
        <DesktopOnlyNotice />
        <div className="hidden lg:grid min-h-dvh place-items-center px-6 bg-paper">
          <div className="text-center max-w-[46ch]">
            <p className="text-meta text-ink-3">Technical assessment</p>
            <h1 className="mt-2">
              {problems.length} problems · {minutes === null ? "Untimed" : `${minutes} minutes`}
            </h1>
            <p className="text-ink-2 mt-2">
              You can move between problems freely. Sample cases are provided
              as reference only; your code is saved for manual review and is
              not executed in the browser.
            </p>
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                requestFullscreen();
              }}
              className="h-10 px-5 mt-6 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Begin assessment
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DesktopOnlyNotice />

      <div className="hidden lg:flex flex-col h-dvh bg-paper">
        <LockdownHeader
          challengeTitle={challengeTitle}
          progress={`Problem ${problemIndex + 1} of ${problems.length}`}
          secondsLeft={lockdown.secondsLeft}
          totalSeconds={totalSeconds}
          violations={lockdown.violations}
          violationLimit={lockdown.violationLimit}
          savedAt={lockdown.savedAt}
          onSubmit={() => setConfirmOpen(true)}
        />

        <nav className="shrink-0 flex items-end gap-1 px-5 bg-card border-b border-line">
          {problems.map((p, index) => (
            <button
              key={p.questionKey}
              type="button"
              onClick={() => setProblemIndex(index)}
              aria-current={index === problemIndex ? "true" : undefined}
              className={cn(
                "h-9 px-4 border-b-2 font-medium",
                index === problemIndex
                  ? "border-red text-brand font-semibold"
                  : "border-transparent text-ink-2 hover:text-brand",
              )}
            >
              {index + 1}. {p.coding?.title ?? `Problem ${index + 1}`}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(280px,340px)_1fr_minmax(240px,300px)]">
          <section className="min-h-0 overflow-y-auto border-r border-line bg-card px-5 py-5 select-none">
            <h3 className="mb-2">Problem {problemIndex + 1}</h3>
            <h2 className="text-[15px] leading-snug">
              {problem.coding?.title ?? problem.prompt}
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-ink-2">
              {(problem.coding?.statement.length
                ? problem.coding.statement
                : [problem.prompt]
              ).map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>

            <h3 className="mt-5 mb-2">Sample cases</h3>
            <div className="flex flex-col gap-2">
              {problem.coding?.sampleTests.map((test) => (
                <div
                  key={test.input}
                  className="rounded-card bg-paper border border-line-2 px-3 py-2.5 font-mono text-[11px] text-ink-2 overflow-x-auto"
                >
                  <div className="whitespace-pre">{test.input}</div>
                  <div className="text-ink-3">→ {test.expected}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 h-11 border-b border-line bg-card">
              <span className="text-meta text-ink-3">
                {problem.coding?.language ?? "Code"}
              </span>
              <span className="text-meta text-ink-3">Manual review</span>
            </div>
            <textarea
              data-editor="true"
              spellCheck={false}
              value={code[problem.questionKey]}
              onChange={(e) => {
                setCode((prev) => ({
                  ...prev,
                  [problem.questionKey]: e.target.value,
                }));
              }}
              onBlur={() => {
                void saveCurrentProblem();
              }}
              className="flex-1 min-h-0 w-full resize-none bg-card px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
              aria-label={`Code editor for ${problem.coding?.title ?? problem.prompt}`}
            />
          </section>

          <section className="min-h-0 flex flex-col border-l border-line bg-card">
            <button
              type="button"
              onClick={() => setOutputOpen(!outputOpen)}
              aria-expanded={outputOpen}
              className="shrink-0 flex items-center justify-between gap-2 px-4 h-11 border-b border-line text-left"
            >
              <span className="text-h3 uppercase tracking-[0.02em] font-semibold text-ink-3">
                Review guidance
              </span>
              <span className="text-meta text-ink-3">
                {outputOpen ? "Hide" : "Show"}
              </span>
            </button>

            {outputOpen ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                <p className="text-meta text-ink-3">
                  Code execution is not enabled. The sample cases in the
                  problem statement are reference examples, and an authorized
                  faculty grader reviews the submitted response manually.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <WarningOverlay
        warning={lockdown.warning}
        violationLimit={lockdown.violationLimit}
        onDismiss={lockdown.dismissWarning}
        onReturnToFullscreen={requestFullscreen}
      />
      <SubmitConfirm
        open={confirmOpen}
        unanswered={problems.length - attempted}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
      <BlockedActionToast message={lockdown.toast} />
    </>
  );
}

function savedCodeFor(
  problem: AssessmentStudentQuestion,
  responses: Record<string, AssessmentResponseInput>
) {
  const saved = responses[problem.questionKey];
  return saved?.kind === "CODING" ? saved.code : problem.coding?.starterCode ?? "";
}

function hasStudentCode(
  problem: AssessmentStudentQuestion,
  value: string
) {
  return value.replace(problem.coding?.starterCode ?? "", "").trim().length > 0;
}
