import { Chip } from "@/components/ui/chip";
import { ScoreDonut } from "@/components/ui/score-donut";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import { cn } from "@/lib/cn";
import type { Recommendation } from "@/lib/recommendations";
import { bandChipVariant, clampScore } from "@/lib/score";
import { WEEKDAY_LABELS } from "@/lib/types";

interface StudentCardProps {
  rec: Recommendation;
  challengeTitle: string;
  /** Drops coursework and availability — for the review pane's narrow rail. */
  compact?: boolean;
}

/**
 * One candidate, rendered the same whether they are the card on top of the deck
 * or the person selected in the review pane. Deliberately layout-agnostic — no
 * width, no positioning — so both callers own their own frame.
 */
export function StudentCard({
  rec,
  challengeTitle,
  compact = false,
}: StudentCardProps) {
  const { student } = rec;
  const atCapacity = student.liveChallenges >= 2;
  const score = clampScore(rec.score);

  return (
    <>
      <div className="flex gap-3.5">
        <StripedPlaceholder
          className={cn(
            "rounded-card shrink-0",
            compact ? "w-10 h-10" : "w-[52px] h-[52px]",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ink">{student.name}</h2>
            <Chip variant={bandChipVariant(rec.fitBand)}>{rec.fitBand} fit</Chip>
            {atCapacity ? <Chip variant="warn">At capacity</Chip> : null}
          </div>
          <p className="text-meta text-ink-3 mt-1">
            {student.major} · Year {student.year} · {student.college} ·{" "}
            {student.hoursAvailable} hrs/wk
          </p>
        </div>
        <ScoreDonut
          score={score}
          band={rec.fitBand}
          size="md"
          label={`Fit score ${score} out of 100 against ${challengeTitle} — ${rec.fitBand}`}
          className="shrink-0"
        />
      </div>

      {student.about && !compact ? (
        <p className="text-ink-2 mt-3.5 leading-relaxed">{student.about}</p>
      ) : null}

      <div className="flex flex-wrap gap-1.5 mt-3.5">
        {student.skills.map((skill) => (
          <Chip
            key={skill}
            variant={
              rec.matchedSkills.includes(skill) ? "default" : "outline-dashed"
            }
          >
            {skill}
          </Chip>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-line-2">
        <h3 className="text-h3 text-ink-3">Why this match</h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {rec.reasons.map((reason) => (
            <li key={reason} className="text-ink-2 flex gap-2 leading-relaxed">
              <span aria-hidden className="text-ok shrink-0">
                ✓
              </span>
              {reason}
            </li>
          ))}
        </ul>

        {rec.caveats.length > 0 ? (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {rec.caveats.map((caveat) => (
              <li
                key={caveat}
                className="text-ink-3 flex gap-2 leading-relaxed text-meta"
              >
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                {caveat}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-meta text-ink-3 mt-3">
          {score} is those reasons weighed against this one brief — it is not a
          rank across challenges, and it does not move on its own.
        </p>
      </div>

      {!compact && student.pinnedCourses.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-line-2">
          <h3 className="text-h3 text-ink-3">Showcased coursework</h3>
          <div className="flex flex-col gap-1.5 mt-2">
            {student.pinnedCourses.map((course) => (
              <div
                key={course.code}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="text-ink-2 min-w-0 truncate">
                  {course.title}{" "}
                  <span className="text-ink-3 text-meta">({course.code})</span>
                </span>
                <span className="font-semibold text-brand shrink-0">
                  {course.grade}
                </span>
              </div>
            ))}
          </div>
          <p className="text-meta text-ink-3 mt-2">
            Chosen by the student. Their GPA and full transcript stay private.
          </p>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 pt-4 border-t border-line-2 grid sm:grid-cols-2 gap-3">
          <div>
            <h3 className="text-h3 text-ink-3">Assessment</h3>
            <p className="text-ink font-medium mt-1">
              {student.assessmentBand ?? "Not assessed yet"}
            </p>
          </div>
          <div>
            <h3 className="text-h3 text-ink-3">Typical week</h3>
            <div className="flex gap-1 mt-1.5">
              {student.weeklyAvailability.map((day, i) => (
                <span
                  key={i}
                  title={day}
                  className={cn(
                    "w-5 h-5 rounded-[3px] grid place-items-center text-[9px] font-semibold",
                    day === "free" && "bg-ok-soft text-ok",
                    day === "partly" && "bg-warn-soft text-warn",
                    day === "busy" && "bg-line-2 text-ink-3",
                  )}
                >
                  {WEEKDAY_LABELS[i]}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-meta text-ink-3 mt-4">
        Matched against {challengeTitle}.
      </p>
    </>
  );
}
