import type { AssessmentTrack } from "@/lib/types";

/**
 * The question banks the lockdown assessment renders. Two tracks per PRD §8.2
 * and §8.3. Nothing is graded for real — the technical track's "run tests"
 * fakes a result against the sample cases below.
 */

export type CognitiveSectionName =
  | "Numerical reasoning"
  | "Logical reasoning"
  | "Verbal reasoning"
  | "Situational judgement";

export interface CognitiveQuestion {
  id: string;
  section: CognitiveSectionName;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface CognitiveSection {
  name: CognitiveSectionName;
  minutes: number;
  questions: CognitiveQuestion[];
}

export interface CodingProblem {
  id: string;
  title: string;
  statement: string[];
  language: string;
  starterCode: string;
  sampleTests: { input: string; expected: string }[];
}

/** PRD §8.2: sectioned, per-section timers, no back-navigation between sections. */
export const cognitiveSections: CognitiveSection[] = [
  {
    name: "Numerical reasoning",
    minutes: 10,
    questions: [
      {
        id: "num-1",
        section: "Numerical reasoning",
        prompt:
          "A distributor ships 4,200 units in Q1 and 5,460 in Q2. What is the percentage increase?",
        options: ["24%", "26%", "30%", "32%"],
        correctIndex: 2,
      },
      {
        id: "num-2",
        section: "Numerical reasoning",
        prompt:
          "A process takes 45 minutes and is improved to take 27 minutes. By what fraction has the time been reduced?",
        options: ["One third", "Two fifths", "Three fifths", "One half"],
        correctIndex: 1,
      },
      {
        id: "num-3",
        section: "Numerical reasoning",
        prompt:
          "Of 850 survey responses, 34% chose option A and 22% chose option B. How many more chose A than B?",
        options: ["96", "102", "108", "114"],
        correctIndex: 1,
      },
    ],
  },
  {
    name: "Logical reasoning",
    minutes: 12,
    questions: [
      {
        id: "log-1",
        section: "Logical reasoning",
        prompt:
          "Every shipment that clears customs is logged. Some logged shipments are delayed. Which statement must be true?",
        options: [
          "Every delayed shipment cleared customs",
          "Some shipments that cleared customs may be delayed",
          "No cleared shipment is delayed",
          "All logged shipments cleared customs",
        ],
        correctIndex: 1,
      },
      {
        id: "log-2",
        section: "Logical reasoning",
        prompt:
          "In the sequence 3, 6, 11, 18, 27, what comes next?",
        options: ["36", "38", "40", "42"],
        correctIndex: 1,
      },
      {
        id: "log-3",
        section: "Logical reasoning",
        prompt:
          "If no warehouse in the northern region uses System A, and Warehouse 7 uses System A, what follows?",
        options: [
          "Warehouse 7 is not in the northern region",
          "Warehouse 7 is in the northern region",
          "System A is unused in every region",
          "Nothing can be concluded",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    name: "Verbal reasoning",
    minutes: 10,
    questions: [
      {
        id: "ver-1",
        section: "Verbal reasoning",
        prompt:
          "\"The pilot succeeded, though its cost per unit remained above the threshold the board had set.\" What does this most strongly imply?",
        options: [
          "The board's threshold was unreasonable",
          "Success was measured by something other than unit cost",
          "The pilot will be rolled out unchanged",
          "Unit cost was the only metric considered",
        ],
        correctIndex: 1,
      },
      {
        id: "ver-2",
        section: "Verbal reasoning",
        prompt:
          "Which word is closest in meaning to \"provisional\" as used in \"a provisional finding\"?",
        options: ["Final", "Tentative", "Detailed", "Disputed"],
        correctIndex: 1,
      },
    ],
  },
  {
    name: "Situational judgement",
    minutes: 8,
    questions: [
      {
        id: "sit-1",
        section: "Situational judgement",
        prompt:
          "Two days before a milestone is due you find an error in data you received from the partner. What is the best first action?",
        options: [
          "Submit on time and note the issue afterwards",
          "Flag it to the partner and your supervisor immediately with what you know",
          "Correct it yourself and proceed without mentioning it",
          "Request an extension before investigating",
        ],
        correctIndex: 1,
      },
      {
        id: "sit-2",
        section: "Situational judgement",
        prompt:
          "Your faculty supervisor and the partner give you conflicting direction on scope. What do you do?",
        options: [
          "Follow the partner, since it is their project",
          "Follow your supervisor, since they assess you",
          "Ask them to align, setting out the trade-off you see",
          "Split the difference and do half of each",
        ],
        correctIndex: 2,
      },
    ],
  },
];

/** PRD §8.3: 2–3 problems, editor, sample tests then full tests on submit. */
export const codingProblems: CodingProblem[] = [
  {
    id: "prob-1",
    title: "Reconcile duplicate shipment records",
    statement: [
      "Four systems report shipments and the same physical shipment can appear in more than one of them.",
      "Given a list of records, each a string of the form \"id:system:units\", return the total units across unique shipment ids. When an id appears more than once, the record with the highest unit count wins.",
      "Return the total as an integer.",
    ],
    language: "Python",
    starterCode: `def total_units(records):
    # records: list[str] like ["A1:erp:120", "A1:wms:118", "B2:erp:40"]
    # return: int
    pass
`,
    sampleTests: [
      { input: '["A1:erp:120", "A1:wms:118", "B2:erp:40"]', expected: "160" },
      { input: '["C3:erp:10", "C3:wms:10"]', expected: "10" },
      { input: "[]", expected: "0" },
    ],
  },
  {
    id: "prob-2",
    title: "Flag likely stockouts",
    statement: [
      "You are given daily stock levels for one product as a list of integers, oldest first, and a lead time in days.",
      "A stockout is likely if the average daily decline over the last seven readings, projected forward by the lead time, would take the current level to zero or below.",
      "Return True if a stockout is likely, otherwise False. If there are fewer than eight readings, return False.",
    ],
    language: "Python",
    starterCode: `def likely_stockout(levels, lead_time_days):
    # levels: list[int], oldest first
    # lead_time_days: int
    # return: bool
    pass
`,
    sampleTests: [
      { input: "[100, 92, 84, 76, 68, 60, 52, 44], 7", expected: "True" },
      { input: "[100, 99, 98, 97, 96, 95, 94, 93], 3", expected: "False" },
      { input: "[50, 40, 30], 5", expected: "False" },
    ],
  },
];

export function isTechnicalTrack(track: AssessmentTrack): boolean {
  return track === "Technical";
}

/** Total budgeted minutes for the cognitive track, summed from its sections. */
export function cognitiveMinutes(): number {
  return cognitiveSections.reduce((total, s) => total + s.minutes, 0);
}

export function totalCognitiveQuestions(): number {
  return cognitiveSections.reduce((n, s) => n + s.questions.length, 0);
}
