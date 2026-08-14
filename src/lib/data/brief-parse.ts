import type {
  AssessmentTrack,
  ChallengeSubType,
  College,
  Compensation,
  Skill,
  WorkMode,
} from "@/lib/types";

/**
 * What "AI parsed your brief" produces.
 *
 * No model runs. This is a fixed result keyed to a fixed filename, which is
 * enough to demonstrate the interaction the feature is really about: the
 * partner reviewing a machine's reading of their document before it becomes a
 * posting. The interesting states are the ones a real parser also produces —
 * confident fields, uncertain fields, and fields the document simply never
 * mentioned — so all three are represented.
 */

export type ParseConfidence = "high" | "medium" | "low";

/**
 * A parsed field. `value === null` means the document did not contain it —
 * rendered as a gap the partner must fill, never as a guess.
 */
export interface ParsedField<T> {
  value: T | null;
  confidence: ParseConfidence;
  /** The sentence the value came from, so a partner can check the reading. */
  evidence: string | null;
}

export interface ParsedBrief {
  fileName: string;
  pages: number;
  title: ParsedField<string>;
  subType: ParsedField<ChallengeSubType>;
  summary: ParsedField<string>;
  responsibilities: ParsedField<string[]>;
  skills: ParsedField<Skill[]>;
  durationWeeks: ParsedField<number>;
  hoursPerWeek: ParsedField<number>;
  teamSize: ParsedField<{ min: number; max: number }>;
  workMode: ParsedField<WorkMode>;
  compensation: ParsedField<Compensation>;
  colleges: ParsedField<College[]>;
  domainTags: ParsedField<string[]>;
  assessmentTrack: ParsedField<AssessmentTrack>;
  deadline: ParsedField<string>;
  startDate: ParsedField<string>;
}

export const sampleBrief: ParsedBrief = {
  fileName: "warehouse-throughput-brief-v3.pdf",
  pages: 4,

  title: {
    value: "Warehouse throughput and picking-route analysis",
    confidence: "high",
    evidence:
      "Project title: Warehouse throughput and picking-route analysis (Hai Phong DC2)",
  },
  subType: {
    value: "Mini-Internship",
    confidence: "medium",
    evidence: "We expect this to run as a part-time placement over one term.",
  },
  summary: {
    value:
      "Our Hai Phong distribution centre is missing its throughput targets and we cannot tell whether the constraint is layout, staffing or the picking routes themselves. We want a team to instrument the current process, find where time is actually lost, and propose changes we can trial without halting operations.",
    confidence: "high",
    evidence:
      "Background: DC2 has missed its stated throughput target in nine of the last twelve weeks…",
  },
  responsibilities: {
    value: [
      "Profile the current picking process from the warehouse management system export",
      "Identify where cycle time is lost and quantify each cause",
      "Propose and simulate at least two layout or routing changes",
      "Present findings the operations team can act on without a data background",
    ],
    confidence: "high",
    evidence: "Scope of work: the team will be expected to…",
  },
  skills: {
    value: [
      { name: "Python", level: "must" },
      { name: "Data analysis", level: "must" },
      { name: "SQL", level: "must" },
      { name: "Process mapping", level: "nice" },
      { name: "Simulation", level: "nice" },
    ],
    confidence: "medium",
    evidence:
      "Candidates should be comfortable with Python and SQL; familiarity with process simulation is a plus.",
  },
  durationWeeks: {
    value: 10,
    confidence: "high",
    evidence: "Duration: 10 weeks, starting at the beginning of the autumn term.",
  },
  hoursPerWeek: {
    value: 10,
    confidence: "medium",
    evidence: "We anticipate around 10 hours per week per student.",
  },
  teamSize: {
    value: { min: 2, max: 3 },
    confidence: "medium",
    evidence: "Ideally a small team — two or three students.",
  },
  workMode: {
    value: "Hybrid",
    confidence: "high",
    evidence:
      "Site visits to DC2 will be required; the rest of the work can be done remotely.",
  },
  domainTags: {
    value: ["Operations", "Logistics", "Process analysis"],
    confidence: "medium",
    evidence: null,
  },
  colleges: {
    value: ["CECS", "CBM"],
    confidence: "low",
    evidence: null,
  },

  // The three gaps. A brief written for humans routinely omits all of these,
  // and inventing them is exactly what a parser must not do.
  compensation: {
    value: null,
    confidence: "low",
    evidence: null,
  },
  deadline: {
    value: null,
    confidence: "low",
    evidence: null,
  },
  startDate: {
    value: null,
    confidence: "low",
    evidence: null,
  },
  assessmentTrack: {
    value: null,
    confidence: "low",
    evidence: null,
  },
};

/** Fields the partner still has to supply before this can be published. */
export function gapsIn(brief: ParsedBrief): string[] {
  const gaps: string[] = [];
  if (brief.compensation.value === null) gaps.push("Compensation");
  if (brief.deadline.value === null) gaps.push("Application deadline");
  if (brief.startDate.value === null) gaps.push("Start date");
  if (brief.assessmentTrack.value === null) gaps.push("Assessment track");
  return gaps;
}

/** How many fields came back with a value — the "14 fields filled" counter. */
export function filledCount(brief: ParsedBrief): number {
  const fields = [
    brief.title,
    brief.subType,
    brief.summary,
    brief.responsibilities,
    brief.skills,
    brief.durationWeeks,
    brief.hoursPerWeek,
    brief.teamSize,
    brief.workMode,
    brief.compensation,
    brief.colleges,
    brief.domainTags,
    brief.assessmentTrack,
    brief.deadline,
    brief.startDate,
  ];
  return fields.filter((f) => f.value !== null).length;
}
