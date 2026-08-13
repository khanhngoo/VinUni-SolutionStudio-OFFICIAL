import type { Student } from "@/lib/types";

/**
 * v1 has no auth — every page renders as this student. GPA 3.82 is chosen so the
 * 3.90-gated challenge fails and the visible-but-gated state is reachable.
 *
 * The profile is deliberately incomplete: no portfolio link, so the
 * completeness checklist has something left to ask for.
 */
export const currentStudent: Student = {
  id: "stu-jordan-lee",
  name: "Jordan Lee",
  email: "jordan.lee@vinuni.edu.vn",
  college: "CECS",
  major: "Computer Engineering",
  year: 3,
  gpa: 3.82,
  gpaScale: 4.0,
  skills: [
    "Python",
    "C++",
    "PyTorch",
    "Computer vision",
    "Data analysis",
    "Sensor integration",
    "React",
  ],
  hoursAvailable: 15,
  workPreference: "Hybrid",
  about:
    "Third-year computer engineering student working on applied ML and data pipelines. Looking for project work where the modelling has to survive contact with messy operational data.",
  creditsEarned: 78,
  transcriptUrl: "/transcripts/stu-jordan-lee.pdf",
  recordSyncedAt: "2026-08-12",
  portfolioUrl: null,
  usualRoles: ["Data & ML", "Backend", "Analysis"],
  preferredTeamMin: 3,
  preferredTeamMax: 4,
  // Mon–Sun. Tuesday and Sunday are the busy ones.
  weeklyAvailability: [
    "free",
    "busy",
    "free",
    "partly",
    "free",
    "free",
    "busy",
  ],
};

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
