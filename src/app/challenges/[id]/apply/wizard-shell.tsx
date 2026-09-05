"use client";

import { useRouter } from "next/navigation";

import { ApplyWizard } from "@/components/apply/apply-wizard";
import type { ApplicationDraft, Challenge, Faculty, Peer, Team } from "@/lib/types";

import { submitApplicationDraft } from "./actions";

interface ApplyWizardShellProps {
  baseTeam: Team;
  challenge: Challenge;
  challengeSlug: string;
  defaultHours: number;
  facultyOptions: Faculty[];
  leaderName: string;
  peers: Peer[];
}

/**
 * Binds the wizard to the server action.
 *
 * The wizard speaks in `ApplicationDraft` and knows nothing about the server;
 * the action speaks in the service's input shape and knows nothing about the
 * wizard. This translates, and refreshes the router on success so the
 * challenge page picks up the new application on the way back.
 */
export function ApplyWizardShell({
  baseTeam,
  challenge,
  challengeSlug,
  defaultHours,
  facultyOptions,
  leaderName,
  peers,
}: ApplyWizardShellProps) {
  const router = useRouter();

  async function handleSubmitted(draft: ApplicationDraft) {
    const error = await submitApplicationDraft({
      challengeSlug,
      committedHoursPerWeek: draft.hoursPerWeek,
      invitedStudentIds: draft.invitedStudentIds,
      motivation: draft.motivation,
      relevantExperience: draft.relevantExperience,
      teamName: draft.teamName,
    });

    if (error) return error;

    router.refresh();
    return null;
  }

  return (
    <>
      <h1 className="mt-5">Apply to {challenge.title}</h1>
      <p className="text-ink-2 mt-2">
        {challenge.orgName ?? challenge.orgCategory} · Team of{" "}
        {challenge.teamSizeMin}–{challenge.teamSizeMax} · {challenge.hoursPerWeek}{" "}
        hours per week
      </p>

      <ApplyWizard
        baseTeam={baseTeam}
        challenge={challenge}
        defaultHours={defaultHours}
        facultyOptions={facultyOptions}
        leaderName={leaderName}
        onSubmitted={handleSubmitted}
        peers={peers}
      />
    </>
  );
}
