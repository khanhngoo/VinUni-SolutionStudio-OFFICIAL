import { Section } from "@/components/ui/section";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import type { Challenge } from "@/lib/types";

interface SummarySectionProps {
  challenge: Challenge;
  studentSkills: string[];
}

export function SummarySection({
  challenge,
  studentSkills,
}: SummarySectionProps) {
  const owned = new Set(studentSkills.map((s) => s.toLowerCase()));
  const matched = challenge.skills.filter((s) => owned.has(s.name.toLowerCase()));

  return (
    <>
      <Section title="What this is">
        <p className="text-ink-2">{challenge.summary}</p>
        <ul className="mt-3.5 flex flex-col gap-1.5">
          {challenge.responsibilities.map((item) => (
            <li key={item} className="flex gap-2.5 text-ink-2">
              <span className="text-ink-3 shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Skills"
        aside={`You have ${matched.length} of ${challenge.skills.length}`}
      >
        <div className="flex flex-wrap gap-1.5">
          {challenge.skills.map((skill) => {
            const has = owned.has(skill.name.toLowerCase());
            return (
              <Chip key={skill.name} variant={has ? "ok" : "default"}>
                {has ? <CheckIcon className="w-3 h-3" /> : null}
                {skill.name}
                <span className="text-ink-3">
                  {skill.level === "must" ? "· required" : "· nice to have"}
                </span>
              </Chip>
            );
          })}
        </div>
      </Section>
    </>
  );
}
