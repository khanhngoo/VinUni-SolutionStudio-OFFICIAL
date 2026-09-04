import { Section } from "@/components/ui/section";
import { Chip } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import {
  challengeDeliverables,
  preferredSkillCount,
  requiredSkillCount,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";

interface SummarySectionProps {
  challenge: MarketplaceChallengeDetailModel;
  /**
   * Null for a viewer with no student profile — a partner or faculty member.
   * They get the composition of the ask ("3 required · 2 preferred") instead of
   * a match count, which would be meaningless for them.
   */
  studentSkills?: string[] | null;
}

export function SummarySection({
  challenge,
  studentSkills,
}: SummarySectionProps) {
  const deliverables = challengeDeliverables(challenge);
  const owned = studentSkills
    ? new Set(studentSkills.map((skill) => skill.toLowerCase()))
    : null;
  const matched = owned
    ? challenge.skills.filter((skill) =>
        owned.has(skill.canonicalName.toLowerCase())
      ).length
    : 0;

  return (
    <>
      <Section title="What this is">
        <p className="text-ink-2">{challenge.description}</p>
        {deliverables.length > 0 ? (
          <ul className="mt-3.5 flex flex-col gap-1.5">
            {deliverables.map((item) => (
              <li key={item} className="flex gap-2.5 text-ink-2">
                <span className="text-ink-3 shrink-0">—</span>
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section
        title="Skills"
        aside={
          owned
            ? `You have ${matched} of ${challenge.skills.length}`
            : `${requiredSkillCount(challenge)} required · ${preferredSkillCount(challenge)} preferred`
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {challenge.skills.map((skill) => {
            const has = owned?.has(skill.canonicalName.toLowerCase()) ?? false;
            return (
              <Chip key={skill.canonicalName} variant={has ? "ok" : "default"}>
                {has ? <CheckIcon className="w-3 h-3" /> : null}
                {skill.canonicalName}
                <span className="text-ink-3">
                  {skill.requirementType === "REQUIRED"
                    ? "· required"
                    : "· preferred"}
                </span>
              </Chip>
            );
          })}
        </div>
      </Section>
    </>
  );
}
