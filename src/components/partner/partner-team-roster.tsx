import { Chip } from "@/components/ui/chip";
import { ScoreDonut } from "@/components/ui/score-donut";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import { cn } from "@/lib/cn";
import { getDirectoryStudentById } from "@/lib/data/directory";
import { scoreStudent } from "@/lib/recommendations";
import { bandChipVariant, clampScore } from "@/lib/score";
import type { Challenge, Team } from "@/lib/types";

/**
 * The team as people, scored the same way the sourcing deck scores anyone else
 * — so a partner comparing a team that applied against a candidate they were
 * recommended is reading one number, not two incompatible ones.
 *
 * Members outside the directory still render; a pending invitation is a name
 * and a role until it is answered, and pretending otherwise would overstate
 * what the partner actually has.
 */
export function PartnerTeamRoster({
  team,
  challenge,
}: {
  team: Team;
  challenge: Challenge;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {team.members.map((member) => {
        const student = getDirectoryStudentById(member.studentId);
        const rec = student ? scoreStudent(student, challenge) : null;
        const pending = member.status === "invited";
        const declined = member.status === "declined";

        return (
          <li
            key={member.studentId}
            className={cn(
              "bg-card border border-line rounded-card px-3.5 py-3 flex items-center gap-3",
              (pending || declined) && "opacity-70",
            )}
          >
            <StripedPlaceholder className="w-10 h-10 rounded-card shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink truncate">
                  {member.name}
                </span>
                <Chip>{member.role}</Chip>
                {member.status === "leader" ? (
                  <Chip variant="solid">Team lead</Chip>
                ) : null}
                {pending ? <Chip variant="warn">Invite pending</Chip> : null}
                {declined ? <Chip variant="outline-dashed">Declined</Chip> : null}
              </div>

              <p className="text-meta text-ink-3 mt-1">
                {student
                  ? `${student.major} · Year ${student.year} · ${student.college} · ${student.hoursAvailable} hrs/wk`
                  : "Profile not shared until they accept."}
              </p>

              {rec ? (
                <p className="text-meta text-ink-3 mt-1">
                  Assessed {student?.assessmentBand ?? "not yet"} ·{" "}
                  {rec.matchedSkills.length} of {challenge.skills.length} skills
                  on this brief
                </p>
              ) : null}
            </div>

            {rec ? (
              <div className="flex items-center gap-2 shrink-0">
                <Chip variant={bandChipVariant(rec.fitBand)}>
                  {rec.fitBand}
                </Chip>
                <ScoreDonut
                  score={clampScore(rec.score)}
                  band={rec.fitBand}
                  size="md"
                  label={`${member.name}: ${clampScore(rec.score)} out of 100 against this brief`}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
