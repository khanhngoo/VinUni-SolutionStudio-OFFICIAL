"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface PreflightCheckProps {
  applicationId: string;
  trackLabel: string;
  minutes: number;
  itemCount: string;
  startAction: (formData: FormData) => void | Promise<void>;
}

type CheckState = "pending" | "pass" | "fail";

interface SystemCheck {
  id: string;
  label: string;
  detail: string;
  state: CheckState;
}

/**
 * PRD §8.4: the student cannot start until every system check passes and the
 * rules are acknowledged. The fullscreen check is real (the browser tells us);
 * the rest are staged, since there is no proctoring backend to ask.
 */
export function PreflightCheck({
  applicationId,
  trackLabel,
  minutes,
  itemCount,
  startAction,
}: PreflightCheckProps) {
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: "browser",
      label: "Supported browser",
      detail: "Chromium, Firefox or Safari, up to date",
      state: "pending",
    },
    {
      id: "connection",
      label: "Stable connection",
      detail: "A 5-minute grace window applies if you drop",
      state: "pending",
    },
    {
      id: "fullscreen",
      label: "Fullscreen capability",
      detail: "The assessment runs fullscreen throughout",
      state: "pending",
    },
    {
      id: "storage",
      label: "Local autosave available",
      detail: "Your answers save every 15 seconds",
      state: "pending",
    },
  ]);
  const [acknowledged, setAcknowledged] = useState(false);

  // Stagger the checks so each row resolves visibly rather than all at once.
  useEffect(() => {
    const timers = checks.map((check, index) =>
      window.setTimeout(
        () => {
          setChecks((prev) =>
            prev.map((c) =>
              c.id === check.id ? { ...c, state: resolveCheck(c.id) } : c,
            ),
          );
        },
        400 + index * 450,
      ),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
    // Runs once — the check list identity never changes after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allPassed = checks.every((c) => c.state === "pass");
  const canStart = allPassed && acknowledged;

  return (
    <>
      <section className="mt-7">
        <h2 className="marker-triangle text-brand mb-3">System check</h2>
        <ul className="bg-card border border-line rounded-card divide-y divide-line-2">
          {checks.map((check) => (
            <li
              key={check.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <StatusDot state={check.state} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{check.label}</p>
                <p className="text-meta text-ink-3">{check.detail}</p>
              </div>
              <span
                className={cn(
                  "text-meta shrink-0",
                  check.state === "pass" && "text-ok font-medium",
                  check.state === "fail" && "text-warn font-medium",
                  check.state === "pending" && "text-ink-3",
                )}
              >
                {check.state === "pass"
                  ? "Ready"
                  : check.state === "fail"
                    ? "Not available"
                    : "Checking…"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h2 className="marker-triangle text-brand mb-3">
          What is monitored
        </h2>
        <div className="bg-card border border-line rounded-card p-5">
          <ul className="flex flex-col gap-2 text-ink-2">
            <Rule>
              The assessment runs in fullscreen. Leaving fullscreen is recorded.
            </Rule>
            <Rule>
              Switching tabs or windows is counted.{" "}
              <strong className="text-ink font-semibold">
                Three violations submits your test automatically.
              </strong>
            </Rule>
            <Rule>
              Copy, paste and right-click are disabled outside the code editor.
            </Rule>
            <Rule>
              You get one attempt. There is no restart once you begin.
            </Rule>
            <Rule>
              Your answers autosave every 15 seconds and on every change.
            </Rule>
            <Rule>
              The timer keeps running if you disconnect. You have a 5-minute
              grace window to return.
            </Rule>
          </ul>

          <label className="flex items-start gap-2.5 mt-5 pt-4 border-t border-line-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-[15px] h-[15px] mt-0.5 rounded-[4px] border-[1.5px] border-line shrink-0 accent-[var(--color-brand)]"
            />
            <span className="text-ink font-medium">
              I understand and agree to these conditions.
            </span>
          </label>
        </div>
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 bg-card border border-line rounded-card p-5">
        <div>
          <p className="font-semibold text-ink">
            {trackLabel} · {minutes} minutes
          </p>
          <p className="text-meta text-ink-3 mt-0.5">
            {itemCount} · single attempt
          </p>
        </div>
        {canStart ? (
          <form action={startAction}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <button
              type="submit"
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start assessment
            </button>
          </form>
        ) : (
          <div className="text-right">
            <button
              type="button"
              disabled
              className="h-10 px-5 rounded-card bg-line-2 border border-line text-ink-3 font-semibold cursor-not-allowed"
            >
              Start assessment
            </button>
            <p className="text-meta text-ink-3 mt-2">
              {allPassed
                ? "Acknowledge the conditions to begin."
                : "Waiting for the system check."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function resolveCheck(id: string): CheckState {
  if (id === "fullscreen") {
    return typeof document !== "undefined" && document.fullscreenEnabled
      ? "pass"
      : "fail";
  }
  if (id === "storage") {
    return typeof window !== "undefined" && "sessionStorage" in window
      ? "pass"
      : "fail";
  }
  return "pass";
}

function StatusDot({ state }: { state: CheckState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "w-[18px] h-[18px] shrink-0 rounded-full grid place-items-center border-[1.5px]",
        state === "pass" && "bg-ok border-ok text-white",
        state === "fail" && "bg-warn-soft border-warn",
        state === "pending" && "bg-card border-line",
      )}
    >
      {state === "pass" ? <CheckIcon className="w-2.5 h-2.5" /> : null}
    </span>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden="true"
        className="w-1 h-1 rounded-full bg-ink-3 mt-[9px] shrink-0"
      />
      <span>{children}</span>
    </li>
  );
}
