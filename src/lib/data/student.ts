import type { Student } from "@/lib/types";

/**
 * v1 has no auth — every page renders as this student. GPA 3.82 is chosen so the
 * 3.90-gated challenge fails and the visible-but-gated state is reachable.
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
};

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
