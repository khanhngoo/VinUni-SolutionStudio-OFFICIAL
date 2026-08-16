import { Section } from "@/components/ui/section";
import { Chip } from "@/components/ui/chip";
import {
  challengeDeliverables,
  preferredSkillCount,
  requiredSkillCount,
  type MarketplaceChallengeDetailModel,
} from "@/lib/challenge-marketplace";

interface SummarySectionProps {
  challenge: MarketplaceChallengeDetailModel;
}

export function SummarySection({ challenge }: SummarySectionProps) {
  const deliverables = challengeDeliverables(challenge);

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
        aside={`${requiredSkillCount(challenge)} required · ${preferredSkillCount(challenge)} preferred`}
      >
        <div className="flex flex-wrap gap-1.5">
          {challenge.skills.map((skill) => {
            return (
              <Chip key={skill.canonicalName}>
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
