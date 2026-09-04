"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ApplyStepper } from "@/components/apply/apply-stepper";
import { ApplySuccess } from "@/components/apply/apply-success";
import { StepMotivation } from "@/components/apply/steps/step-motivation";
import { StepReview } from "@/components/apply/steps/step-review";
import { StepSupervisor } from "@/components/apply/steps/step-supervisor";
import { StepTeam } from "@/components/apply/steps/step-team";
import { cn } from "@/lib/cn";
import {
  validateAll,
  validateMotivation,
  validateSupervisor,
  validateTeam,
  type ApplyDraftState,
  type ApplyErrors,
} from "@/lib/apply-validation";
import type { Peer } from "@/lib/data/peers";
import { now } from "@/lib/dates";
import { withInvites } from "@/lib/teams";
import type { ApplicationDraft, Challenge, Faculty, Team } from "@/lib/types";

const STEPS = ["Your team", "Motivation", "Supervisor", "Review"];

interface ApplyWizardProps {
  challenge: Challenge;
  /** The roster before any invitation goes out — usually a team of one. */
  baseTeam: Team;
  peers: Peer[];
  facultyOptions: Faculty[];
  defaultHours: number;
  leaderName: string;
  /**
   * Submits the draft. Returns an error message to show in place, or nothing
   * on success. Server-side validation re-runs `validateAll`, so a rejection
   * here is a real conflict rather than a missed field.
   */
  onSubmitted?: (draft: ApplicationDraft) => Promise<string | null> | void;
}

/**
 * All four steps of an application, in one client component.
 *
 * The alternative — a route per step with `?step=` — would survive a reload,
 * but every field would then have to live in the URL or be lost on each
 * navigation. So the whole draft is local state and a reload starts over,
 * which is the same bargain every other form in the prototype makes.
 *
 * The team is derived rather than stored: the wizard holds a list of invited
 * ids, and `withInvites` rebuilds the roster on each render so `teamReadiness`,
 * `TeamFit` and `canAddMore` all see the live version without knowing the
 * wizard exists.
 */
export function ApplyWizard({
  challenge,
  baseTeam,
  peers,
  facultyOptions,
  defaultHours,
  leaderName,
  onSubmitted,
}: ApplyWizardProps) {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<ApplyErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState(baseTeam.name);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [hours, setHours] = useState(String(defaultHours));
  const [facultyId, setFacultyId] = useState("");

  const draft: ApplyDraftState = {
    teamName,
    motivation,
    experience,
    hours,
    facultyId,
  };

  const team = useMemo(
    () =>
      withInvites(
        baseTeam,
        teamName.trim() === "" ? baseTeam.name : teamName,
        peers.filter((p) => invitedIds.includes(p.id)),
        now().toISOString().slice(0, 10),
      ),
    [baseTeam, teamName, peers, invitedIds],
  );

  const supervisor = facultyOptions.find((f) => f.id === facultyId);

  function errorsForStep(n: number): ApplyErrors {
    if (n === 0) return validateTeam(draft, team, challenge);
    if (n === 1) return validateMotivation(draft);
    if (n === 2) return validateSupervisor(draft);
    return validateAll(draft, team, challenge);
  }

  function goNext() {
    const found = errorsForStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const next = step + 1;
    setErrors({});
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  }

  function jump(to: number) {
    if (to > furthest) return;
    setErrors({});
    setStep(to);
  }

  function submit() {
    const found = validateAll(draft, team, challenge);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // The shape a real submission would POST. Assembled here so the draft the
    // wizard collects is provably the draft the API would want; with no
    // persistence layer there is nowhere to send it.
    const application: ApplicationDraft = {
      challengeId: challenge.id,
      motivation,
      relevantExperience: experience,
      hoursPerWeek: Number(hours),
      facultySupervisorId: facultyId,
      teamName: teamName.trim() === "" ? baseTeam.name : teamName,
      invitedStudentIds: invitedIds,
    };

    setSubmitting(true);
    void Promise.resolve(onSubmitted?.(application))
      .then((message) => {
        if (message) {
          setSubmitError(message);
          return;
        }
        setSubmitted(true);
      })
      .catch(() => {
        setSubmitError("The application could not be submitted. Please try again.");
      })
      .finally(() => setSubmitting(false));
  }

  if (submitted) {
    return (
      <div className="bg-card border border-line rounded-card mt-6">
        <ApplySuccess supervisorName={supervisor?.name ?? "Your supervisor"} />
        <div className="flex flex-wrap justify-center gap-2.5 px-6 pb-8">
          <Link
            href={`/challenges/${challenge.id}`}
            className="inline-flex items-center h-10 px-5 rounded-card border border-line text-brand font-semibold hover:border-brand"
          >
            Back to the challenge
          </Link>
          <Link
            href="/challenges"
            className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
          >
            Browse more
          </Link>
        </div>
      </div>
    );
  }

  const isReview = step === STEPS.length - 1;

  return (
    <>
      <ApplyStepper
        steps={STEPS}
        active={step}
        furthest={furthest}
        onJump={jump}
      />

      {step === 0 ? (
        <StepTeam
          challenge={challenge}
          team={team}
          peers={peers}
          teamName={teamName}
          invited={invitedIds}
          errors={errors}
          onName={setTeamName}
          onInvite={(id) => setInvitedIds((ids) => [...ids, id])}
          onRemove={(id) =>
            setInvitedIds((ids) => ids.filter((existing) => existing !== id))
          }
        />
      ) : null}

      {step === 1 ? (
        <StepMotivation
          challenge={challenge}
          motivation={motivation}
          experience={experience}
          errors={errors}
          onMotivation={setMotivation}
          onExperience={setExperience}
        />
      ) : null}

      {step === 2 ? (
        <StepSupervisor
          challenge={challenge}
          facultyOptions={facultyOptions}
          hours={hours}
          facultyId={facultyId}
          errors={errors}
          onHours={setHours}
          onFaculty={setFacultyId}
        />
      ) : null}

      {isReview ? (
        <StepReview
          challenge={challenge}
          team={team}
          supervisor={supervisor}
          motivation={motivation}
          experience={experience}
          hours={hours}
          errors={errors}
          onJump={jump}
        />
      ) : null}

      {errors.team && step === 0 ? (
        <p className="text-meta text-warn mt-4 text-right">{errors.team}</p>
      ) : null}

      {submitError ? (
        <div
          role="alert"
          className="mt-4 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2"
        >
          {submitError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2.5 mt-7">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => jump(step - 1)}
            className="inline-flex items-center h-10 px-5 rounded-card border border-line text-ink-2 font-medium hover:border-ink-3 hover:text-ink"
          >
            Back
          </button>
        ) : (
          <Link
            href={`/challenges/${challenge.id}`}
            className="inline-flex items-center h-10 px-5 rounded-card border border-line text-brand font-semibold hover:border-brand hover:text-brand"
          >
            Save draft
          </Link>
        )}

        <button
          type="button"
          onClick={isReview ? submit : goNext}
          disabled={submitting}
          className={cn(
            "inline-flex items-center h-10 px-5 rounded-card font-semibold",
            "bg-brand text-white hover:bg-brand-deep disabled:opacity-60",
          )}
        >
          {isReview
            ? submitting
              ? "Submitting…"
              : "Submit application"
            : `Next · ${STEPS[step + 1]}`}
        </button>
      </div>

      <p className="text-meta text-ink-3 mt-6">
        Applying as {leaderName} · you are the team leader and the partner&apos;s
        point of contact. Nothing is saved until you submit, and a reload starts
        this over. Everyone you invite is asked to confirm before the team is
        final.
      </p>
    </>
  );
}
