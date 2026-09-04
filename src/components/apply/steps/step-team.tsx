"use client";

import { Field, inputClass } from "@/components/apply/field";
import { InvitePicker } from "@/components/team/invite-picker";
import { MemberRow } from "@/components/team/member-row";
import { TeamFit } from "@/components/team/team-fit";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import type { Peer } from "@/lib/data/peers";
import { canAddMore, sizeLabel, teamSize } from "@/lib/teams";
import type { ApplyErrors } from "@/lib/apply-validation";
import type { Challenge, Team } from "@/lib/types";

interface StepTeamProps {
  challenge: Challenge;
  team: Team;
  peers: Peer[];
  teamName: string;
  invited: string[];
  errors: ApplyErrors;
  onName: (name: string) => void;
  onInvite: (peerId: string) => void;
  onRemove: (peerId: string) => void;
}

/**
 * Step one. Teams are per-application, so nothing downstream can start until
 * the roster is legal and every invitation has been answered.
 */
export function StepTeam({
  challenge,
  team,
  peers,
  teamName,
  invited,
  errors,
  onName,
  onInvite,
  onRemove,
}: StepTeamProps) {
  const takenIds = team.members.map((m) => m.studentId);

  return (
    <>
      <h1 className="mt-5">Form your team</h1>
      <p className="text-ink-2 mt-2">
        {challenge.orgName ?? challenge.orgCategory} asks for{" "}
        <strong className="text-ink font-semibold">
          {sizeLabel(challenge)} students
        </strong>{" "}
        at {challenge.hoursPerWeek} h/wk for {challenge.durationWeeks} weeks.
      </p>

      <Section title="Team">
        <div className="bg-card border border-line rounded-card p-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <Field label="Team name" error={errors.teamName} htmlFor="team-name">
                <input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => onName(e.target.value)}
                  className={inputClass(Boolean(errors.teamName))}
                />
              </Field>
            </div>
            <div className="w-[150px]">
              <p className="text-meta text-ink-3 uppercase tracking-[0.07em]">
                Size
              </p>
              <p className="mt-1.5 h-9 flex items-center font-semibold text-ink">
                {teamSize(team)} of {sizeLabel(challenge)}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Members" aside={`${team.members.length} listed`}>
        <ul className="flex flex-col gap-2.5">
          {team.members.map((member) => (
            <MemberRow
              key={member.studentId}
              member={member}
              trailing={<Chip>{member.role}</Chip>}
            />
          ))}
        </ul>

        <div className="mt-2.5">
          <InvitePicker
            peers={peers}
            takenIds={takenIds}
            canInvite={canAddMore(team, challenge)}
            invited={invited}
            onInvite={onInvite}
            onRemove={onRemove}
          />
        </div>
      </Section>

      <Section title="Fit">
        <TeamFit team={team} challenge={challenge} />
      </Section>
    </>
  );
}
