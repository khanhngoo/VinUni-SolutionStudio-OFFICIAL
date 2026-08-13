import { MemberRow } from "@/components/team/member-row";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import {
  pendingMembers,
  sizeLabel,
  teamReadiness,
  teamSize,
} from "@/lib/teams";
import type { Challenge, Team } from "@/lib/types";

/**
 * The team as it sits on a live application. Size is a range, so losing a
 * member is not automatically fatal — the readiness check says whether the
 * application still stands, which is the question anyone actually has.
 */
export function TeamRoster({
  team,
  challenge,
}: {
  team: Team;
  challenge: Challenge;
}) {
  const pending = pendingMembers(team);
  const { ready, blockers } = teamReadiness(team, challenge);

  return (
    <Section
      title={team.name}
      aside={`${teamSize(team)} of ${sizeLabel(challenge)}`}
    >
      <ul className="flex flex-col gap-2.5">
        {team.members.map((member) => (
          <MemberRow
            key={member.studentId}
            member={member}
            trailing={<Chip>{member.role}</Chip>}
          />
        ))}
      </ul>

      {ready ? (
        <p className="text-meta text-ink-3 mt-2.5">
          Each member sits the assessment individually. The team moves forward
          when everyone is in.
        </p>
      ) : (
        <div className="mt-2.5 rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-2.5">
          {blockers.map((blocker) => (
            <p key={blocker} className="text-ink-2">
              {blocker}
            </p>
          ))}
          {pending.length > 0 ? (
            <p className="text-meta text-ink-3 mt-1.5">
              Invitations expire after seven days.
            </p>
          ) : null}
        </div>
      )}
    </Section>
  );
}
