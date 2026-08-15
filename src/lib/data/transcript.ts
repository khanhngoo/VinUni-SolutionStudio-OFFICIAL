import type { Course, Experience } from "@/lib/types";

/**
 * Jordan's academic record. Everything marked `registrar` is treated as
 * verified across the whole product; the single `self` row exists so the
 * unverified treatment is reachable on screen.
 *
 * Terms run newest first — the profile shows the top few and links out to the
 * registrar's PDF for the rest.
 */
export const courses: Course[] = [
  {
    id: "crs-cs3040",
    title: "Machine Learning",
    code: "CS3040",
    term: "Fall 2025",
    credits: 3,
    grade: "A",
    source: "registrar",
  },
  {
    id: "crs-cs3220",
    title: "Computer Vision",
    code: "CS3220",
    term: "Fall 2025",
    credits: 3,
    grade: "A−",
    source: "registrar",
  },
  {
    id: "crs-cs3110",
    title: "Database Systems",
    code: "CS3110",
    term: "Fall 2025",
    credits: 3,
    grade: "A−",
    source: "registrar",
  },
  {
    id: "crs-cs2100",
    title: "Data Structures & Algorithms",
    code: "CS2100",
    term: "Spring 2025",
    credits: 4,
    grade: "A",
    source: "registrar",
  },
  {
    id: "crs-ma2030",
    title: "Probability & Statistics",
    code: "MA2030",
    term: "Spring 2025",
    credits: 3,
    grade: "B+",
    source: "registrar",
  },
  {
    id: "crs-ee2010",
    title: "Signals and Systems",
    code: "EE2010",
    term: "Spring 2025",
    credits: 3,
    grade: "B+",
    source: "registrar",
  },
  {
    id: "crs-coursera-dl",
    title: "Deep Learning Specialisation",
    code: "Coursera",
    term: "2025",
    credits: null,
    grade: null,
    source: "self",
  },
];

export const experience: Experience[] = [
  {
    id: "exp-fintech",
    kind: "Internship",
    role: "Data analyst intern",
    organisation: "Fintech scale-up, Hanoi",
    from: "Jun 2025",
    to: "Aug 2025",
    summary:
      "Built churn dashboards over transaction data; shipped a retention model that the growth team still runs weekly.",
    skills: ["Python", "SQL", "Data analysis"],
  },
  {
    id: "exp-ta",
    kind: "Teaching",
    role: "Teaching assistant — CS2100",
    organisation: "VinUni CECS",
    from: "Sep 2025",
    to: null,
    summary: null,
    skills: ["C++"],
  },
];
