import { MemberRow } from "@/components/team/member-row";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import type { InviteStatus, TeamMember } from "@/lib/types";

type MemberStatus = "INVITED" | "ACCEPTED" | "DECLINED" | "REMOVED" | string;

interface ApplicationMemberInput {
  committedHoursPerWeek: number | null;
  fullName: string;
  invitedAt: Date | null;
  memberRole: string;
  preferredRole: string | null;
  status: MemberStatus;
  student: {
    availableHoursPerWeek: number | null;
    major: string | null;
    studyYear: number | null;
  };
}

interface ApplicationRosterProps {
  members: ApplicationMemberInput[];
  teamName: string | null;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
}

/**
 * The team as it sits on a live application. Size is a range, so a pending
 * invitation is not automatically fatal — the readiness line says whether the
 * application still stands, which is the question anyone actually has.
 */
export function ApplicationRoster({
  members,
  teamName,
  teamSizeMax,
  teamSizeMin,
}: ApplicationRosterProps) {
  const active = members.filter((member) => member.status !== "REMOVED");
  const accepted = active.filter(
    (member) => member.status === "ACCEPTED" || member.memberRole === "LEADER"
  );
  const pending = active.filter((member) => member.status === "INVITED");
  const short = teamSizeMin !== null && accepted.length < teamSizeMin;

  return (
    <Section
      title={teamName ?? "Your team"}
      aside={`${accepted.length} of ${sizeLabel(teamSizeMin, teamSizeMax)}`}
    >
      <ul className="flex flex-col gap-2.5">
        {active.map((member) => (
          <MemberRow
            key={member.fullName}
            member={toTeamMember(member)}
            trailing={
              member.preferredRole ? <Chip>{member.preferredRole}</Chip> : null
            }
          />
        ))}
      </ul>

      {short ? (
        <div className="mt-2.5 rounded-card border border-l-[3px] border-warn/35 border-l-warn bg-warn-soft px-4 py-2.5">
          <p className="text-ink-2">
            {teamSizeMin! - accepted.length} more member
            {teamSizeMin! - accepted.length === 1 ? "" : "s"} must accept before
            this application is complete.
          </p>
          {pending.length > 0 ? (
            <p className="text-meta text-ink-3 mt-1.5">
              Invitations expire after seven days.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-meta text-ink-3 mt-2.5">
          Each member sits the assessment individually. The team moves forward
          when everyone is in.
        </p>
      )}
    </Section>
  );
}

function sizeLabel(min: number | null, max: number | null) {
  if (min === null && max === null) return "any size";
  if (min !== null && max !== null) {
    return min === max ? `${min}` : `${min}–${max}`;
  }
  return `${min ?? max}`;
}

function toTeamMember(member: ApplicationMemberInput): TeamMember {
  return {
    studentId: member.fullName,
    name: member.fullName,
    major: member.student.major ?? "Major not set",
    year: member.student.studyYear ?? 0,
    role: member.preferredRole ?? "Contributor",
    hoursAvailable:
      member.committedHoursPerWeek ?? member.student.availableHoursPerWeek ?? 0,
    status: toInviteStatus(member),
    invitedAt: member.invitedAt
      ? member.invitedAt.toISOString().slice(0, 10)
      : null,
  } as TeamMember;
}

function toInviteStatus(member: ApplicationMemberInput): InviteStatus {
  if (member.memberRole === "LEADER") return "leader";
  if (member.status === "ACCEPTED") return "accepted";
  if (member.status === "DECLINED") return "declined";
  return "invited";
}
