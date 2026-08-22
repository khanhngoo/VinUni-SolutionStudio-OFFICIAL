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
  minutes: number;
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

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; passed: number; total: number };

/**
 * PRD §8.3: three panes — statement, editor, test output. The editor is a plain
 * textarea and nothing is executed; "Run sample tests" reports a plausible
 * result derived from whether the student has written anything substantive.
 * A real implementation would ship this to a sandboxed runner.
 */
export function TechnicalRunner({
  applicationId,
  challengeTitle,
  minutes,
  problems,
  responses,
  submitAction,
  saveResponseAction,
}: TechnicalRunnerProps) {
  const router = useRouter();
  const totalSeconds = minutes * 60;

  const [problemIndex, setProblemIndex] = useState(0);
  const [code, setCode] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      problems.map((p) => [
        p.questionKey,
        savedCodeFor(p, responses),
      ]),
    ),
  );
  const [runs, setRuns] = useState<Record<string, RunState>>(() =>
    Object.fromEntries(problems.map((p) => [p.questionKey, { status: "idle" }])),
  );
  const [outputOpen, setOutputOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [started, setStarted] = useState(false);

  const lockdown = useLockdown({
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
  const run = runs[problem.questionKey];

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

  function runSampleTests() {
    setRuns((prev) => ({ ...prev, [problem.questionKey]: { status: "running" } }));
    setOutputOpen(true);

    window.setTimeout(() => {
      const written = code[problem.questionKey]
        .replace(problem.coding?.starterCode ?? "", "")
        .trim();
      const hasBody = written.length > 12 && !written.includes("pass");
      const total = problem.coding?.sampleTests.length ?? 0;
      const passed = hasBody ? total : 0;
      setRuns((prev) => ({
        ...prev,
        [problem.questionKey]: { status: "done", passed, total },
      }));
      markSaved();
      void saveCurrentProblem();
    }, 900);
  }

  async function saveCurrentProblem() {
    const response = {
      kind: "CODING",
      code: code[problem.questionKey] ?? "",
    } satisfies AssessmentResponseInput;
    await saveResponseAction(problem.questionKey, response);
  }

  async function submit() {
    markFinished();
    await submitAction(
      Object.fromEntries(
        problems.map((p) => [
          p.questionKey,
          {
            kind: "CODING",
            code: code[p.questionKey] ?? "",
          } satisfies AssessmentResponseInput,
        ]),
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
            <h1 className="mt-2">{problems.length} problems · {minutes} minutes</h1>
            <p className="text-ink-2 mt-2">
              You can move between problems freely. Sample tests can be run as
              often as you like; full tests run once on submit.
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
              <button
                type="button"
                onClick={runSampleTests}
                disabled={run.status === "running"}
                className="h-8 px-3.5 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 disabled:opacity-60"
              >
                {run.status === "running" ? "Running…" : "Run sample tests"}
              </button>
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
                markSaved();
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
                Test output
              </span>
              <span className="text-meta text-ink-3">
                {outputOpen ? "Hide" : "Show"}
              </span>
            </button>

            {outputOpen ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {run.status === "idle" ? (
                  <p className="text-meta text-ink-3">
                    Run the sample tests to see output here.
                  </p>
                ) : run.status === "running" ? (
                  <p className="text-meta text-ink-3">Running sample tests…</p>
                ) : (
                  <>
                    <p
                      className={cn(
                        "font-semibold",
                        run.passed === run.total ? "text-ok" : "text-warn",
                      )}
                    >
                      {run.passed} of {run.total} sample tests passed
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {problem.coding?.sampleTests.map((test, index) => (
                        <li
                          key={test.input}
                          className="font-mono text-[11px] text-ink-2"
                        >
                          <span
                            className={
                              index < run.passed ? "text-ok" : "text-warn"
                            }
                          >
                            {index < run.passed ? "PASS" : "FAIL"}
                          </span>{" "}
                          case {index + 1}
                        </li>
                      ))}
                    </ul>
                    <p className="text-meta text-ink-3 mt-4">
                      Sample tests only. Full tests run when you submit.
                    </p>
                  </>
                )}
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
