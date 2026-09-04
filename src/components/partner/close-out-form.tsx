"use client";

import { useState } from "react";
import Link from "next/link";
import { GroupHeading } from "@/components/partner/group-heading";
import { cn } from "@/lib/cn";
import type { ScoreBand, WouldHostAgain } from "@/lib/types";

const BANDS: ScoreBand[] = [
  "Strong",
  "Proficient",
  "Developing",
  "Below threshold",
];

const HOST_AGAIN: WouldHostAgain[] = ["Yes", "With reservations", "No"];

/**
 * The partner's close-out review.
 *
 * Bands rather than stars or a score out of ten, for the same reason the
 * assessment result screen uses them: the student reads this, and a number
 * invites them to compare themselves against a cohort they cannot see. Bands
 * say what was true of the work without implying a ranking.
 *
 * The private note is the one field the student never sees, and it says so on
 * the field rather than in a policy document — the moment a partner is deciding
 * what to type is the only moment that disclaimer is worth anything.
 */
export function CloseOutForm({
  teamName,
  memberNames,
  applicationId,
}: {
  teamName: string;
  memberNames: string[];
  applicationId: string;
}) {
  const [quality, setQuality] = useState<ScoreBand | null>(null);
  const [reliability, setReliability] = useState<ScoreBand | null>(null);
  const [hostAgain, setHostAgain] = useState<WouldHostAgain | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ready =
    quality !== null &&
    reliability !== null &&
    hostAgain !== null &&
    note.trim().length > 0;

  if (submitted) {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-8 text-center">
        <span className="w-9 h-9 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto text-[16px]">
          ✓
        </span>
        <p className="font-semibold text-ink mt-3">
          Feedback sent to {teamName}
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto leading-relaxed">
          {memberNames.length === 1
            ? `${memberNames[0]} and their supervisor can see it now.`
            : `All ${memberNames.length} members and their supervisor can see it now.`}{" "}
          The engagement is archived and read-only from here.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          <Link
            href={`/partner/projects/${applicationId}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-card border border-line text-ink-2 font-medium hover:border-brand hover:text-brand"
          >
            Back to the project
          </Link>
          <Link
            href="/partner/projects"
            className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            All projects
          </Link>
        </div>
        <p className="text-meta text-ink-3 mt-5">
          Nothing was saved — this demo has no persistence layer.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="mt-7">
        <GroupHeading title="How did it go" />
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-5">
          <BandRow
            label="Quality of work"
            hint="The deliverables themselves — did they solve the problem you posted?"
            value={quality}
            onChange={setQuality}
          />
          <BandRow
            label="Communication & reliability"
            hint="Turning up, flagging problems early, hitting the dates they agreed."
            value={reliability}
            onChange={setReliability}
          />

          <div>
            <p className="text-[12px] font-semibold text-ink-2">
              Would you host this team again?
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {HOST_AGAIN.map((option) => (
                <Choice
                  key={option}
                  selected={hostAgain === option}
                  onClick={() => setHostAgain(option)}
                >
                  {option}
                </Choice>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <GroupHeading title="Written feedback" />
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-5">
          <div>
            <label
              htmlFor="close-note"
              className="block text-[12px] font-semibold text-ink-2"
            >
              Shared with the team and their supervisor
            </label>
            <p className="text-meta text-ink-3 mt-0.5 mb-2">
              This goes on their Studio record. Concrete beats generous.
            </p>
            <textarea
              id="close-note"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What they delivered, what you are using, and the one thing you would tell them to work on."
              className="w-full border border-line rounded-card px-3 py-2 text-body resize-y leading-relaxed"
            />
          </div>

          <div>
            <label
              htmlFor="close-private"
              className="block text-[12px] font-semibold text-ink-2"
            >
              Private note to CAID
              <span className="font-normal text-ink-3"> — optional</span>
            </label>
            <p className="text-meta text-ink-3 mt-0.5 mb-2">
              Never shown to the team. For anything the Studio should know that
              would not be fair to put on a student&apos;s record.
            </p>
            <textarea
              id="close-private"
              rows={3}
              placeholder="Leave blank unless something needs flagging."
              className="w-full border border-line rounded-card px-3 py-2 text-body resize-y leading-relaxed"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-line">
        <p className="text-meta text-ink-3 max-w-[42ch] leading-relaxed">
          Bands, not scores — the same vocabulary students see of their own
          assessments.
        </p>
        <button
          type="button"
          disabled={!ready}
          onClick={() => setSubmitted(true)}
          className="inline-flex items-center justify-center h-9 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit &amp; close
        </button>
      </div>
    </>
  );
}

function BandRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: ScoreBand | null;
  onChange: (band: ScoreBand) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-ink-2">{label}</p>
      <p className="text-meta text-ink-3 mt-0.5 mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {BANDS.map((band) => (
          <Choice
            key={band}
            selected={value === band}
            onClick={() => onChange(band)}
          >
            {band}
          </Choice>
        ))}
      </div>
    </div>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center rounded-card px-2.5 py-1 text-[11px] leading-none whitespace-nowrap border transition-colors",
        selected
          ? "bg-brand border-brand text-white font-medium"
          : "bg-card border-dashed border-line text-ink-3 hover:border-brand hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
