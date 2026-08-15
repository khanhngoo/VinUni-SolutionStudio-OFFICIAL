import {
  AvailabilityGrid,
  AvailabilityLegend,
} from "@/components/profile/availability-grid";
import { Chip } from "@/components/ui/chip";
import type { Student } from "@/lib/types";

/**
 * How this student works on a team. Not vanity data — the apply flow reads
 * roles and availability straight off here, so an empty block is what stops
 * someone being invited to anything.
 */
export function TeamPreferences({ student }: { student: Student }) {
  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <p className="text-meta text-ink-3">Usual roles</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {student.usualRoles.length > 0 ? (
              student.usualRoles.map((role) => (
                <Chip key={role} variant="solid">
                  {role}
                </Chip>
              ))
            ) : (
              <Chip variant="outline-dashed">None set</Chip>
            )}
          </div>
        </div>

        <div className="w-[140px]">
          <p className="text-meta text-ink-3">Preferred team size</p>
          <p className="font-semibold text-ink mt-2">
            {student.preferredTeamMin} – {student.preferredTeamMax} people
          </p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-line-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-meta text-ink-3">
            Typical week · {student.hoursAvailable} h
          </p>
          <Chip>{student.workPreference}</Chip>
        </div>
        <AvailabilityGrid
          availability={student.weeklyAvailability}
          className="mt-3 max-w-[280px]"
        />
        <div className="mt-2.5">
          <AvailabilityLegend />
        </div>
      </div>
    </div>
  );
}
