import type { Faculty } from "@/lib/types";

/**
 * Supervision capacity (PRD §7.2): faculty at capacity stay visible in the picker
 * but cannot be nominated. `fac-osei` and `fac-tran` are full on purpose.
 */
export const faculty: Faculty[] = [
  {
    id: "fac-rivera",
    name: "Dr. Alicia Rivera",
    title: "Associate Professor",
    college: "CECS",
    department: "Computer Science",
    researchAreas: ["Machine learning", "Computer vision"],
    slotsUsed: 3,
    slotsTotal: 5,
  },
  {
    id: "fac-nguyen-k",
    name: "Dr. Kevin Nguyen",
    title: "Assistant Professor",
    college: "CECS",
    department: "Electrical Engineering",
    researchAreas: ["Robotics", "Embedded systems"],
    slotsUsed: 1,
    slotsTotal: 4,
  },
  {
    id: "fac-pham",
    name: "Dr. Minh Pham",
    title: "Professor",
    college: "CECS",
    department: "Computer Science",
    researchAreas: ["Distributed systems", "Data engineering"],
    slotsUsed: 2,
    slotsTotal: 5,
  },
  {
    id: "fac-osei",
    name: "Dr. Diane Osei",
    title: "Associate Professor",
    college: "CBM",
    department: "Analytics & Operations",
    researchAreas: ["Data systems", "Analytics"],
    slotsUsed: 4,
    slotsTotal: 4,
  },
  {
    id: "fac-do",
    name: "Dr. Hanh Do",
    title: "Assistant Professor",
    college: "CBM",
    department: "Marketing",
    researchAreas: ["Consumer behaviour", "Brand strategy"],
    slotsUsed: 1,
    slotsTotal: 3,
  },
  {
    id: "fac-tran",
    name: "Dr. Bao Tran",
    title: "Professor",
    college: "CAS",
    department: "Physics",
    researchAreas: ["Materials", "Spectroscopy"],
    slotsUsed: 3,
    slotsTotal: 3,
  },
  {
    id: "fac-le",
    name: "Dr. Thu Le",
    title: "Assistant Professor",
    college: "CAS",
    department: "Environmental Science",
    researchAreas: ["Sustainability", "Field methods"],
    slotsUsed: 0,
    slotsTotal: 4,
  },
  {
    id: "fac-vu",
    name: "Dr. Lan Vu",
    title: "Associate Professor",
    college: "CHS",
    department: "Public Health",
    researchAreas: ["Clinical informatics", "Epidemiology"],
    slotsUsed: 2,
    slotsTotal: 5,
  },
];

export function getFacultyById(id: string): Faculty | undefined {
  return faculty.find((f) => f.id === id);
}

/** v1 has no auth — the faculty portal renders as this supervisor. */
export const currentFacultyId = "fac-pham";

export function isAtCapacity(f: Faculty): boolean {
  return f.slotsUsed >= f.slotsTotal;
}
