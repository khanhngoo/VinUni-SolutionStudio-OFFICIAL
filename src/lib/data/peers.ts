import type { College, DayAvailability, TeamRole } from "@/lib/types";

/**
 * Other students, for the invite picker. Deliberately not full `Student`
 * records — a teammate never sees another student's GPA or transcript, only
 * what bears on working together.
 *
 * `liveChallenges` is what makes someone a bad invite: two at once is against
 * the Studio's own guidance, so those render unavailable rather than hidden.
 */
export interface Peer {
  id: string;
  name: string;
  major: string;
  year: number;
  college: College;
  roles: TeamRole[];
  hoursAvailable: number;
  weeklyAvailability: DayAvailability[];
  liveChallenges: number;
}

export const peers: Peer[] = [
  {
    id: "stu-priya-raman",
    name: "Priya Raman",
    major: "Computer Science",
    year: 3,
    college: "CECS",
    roles: ["Backend", "Data & ML"],
    hoursAvailable: 12,
    weeklyAvailability: ["free", "free", "partly", "busy", "free", "free", "busy"],
    liveChallenges: 0,
  },
  {
    id: "stu-minh-anh",
    name: "Minh Anh Nguyen",
    major: "Business Analytics",
    year: 2,
    college: "CBM",
    roles: ["Domain expert", "Analysis"],
    hoursAvailable: 10,
    weeklyAvailability: ["busy", "free", "free", "partly", "free", "busy", "busy"],
    liveChallenges: 0,
  },
  {
    id: "stu-thao-ha",
    name: "Thao Ha",
    major: "Economics",
    year: 3,
    college: "CBM",
    roles: ["Domain expert", "Research"],
    hoursAvailable: 6,
    weeklyAvailability: ["busy", "partly", "busy", "free", "partly", "busy", "busy"],
    liveChallenges: 1,
  },
  {
    id: "stu-duc-khanh",
    name: "Duc Khanh Vo",
    major: "Data Science",
    year: 4,
    college: "CECS",
    roles: ["Data & ML", "Analysis"],
    hoursAvailable: 0,
    weeklyAvailability: ["busy", "busy", "busy", "busy", "busy", "busy", "busy"],
    liveChallenges: 2,
  },
  {
    id: "stu-linh-pham",
    name: "Linh Pham",
    major: "Design",
    year: 2,
    college: "CAS",
    roles: ["Design", "Frontend"],
    hoursAvailable: 14,
    weeklyAvailability: ["free", "partly", "free", "free", "busy", "free", "busy"],
    liveChallenges: 0,
  },
  {
    id: "stu-hoang-tran",
    name: "Hoang Tran",
    major: "Mechanical Engineering",
    year: 4,
    college: "CECS",
    roles: ["Coordination", "Research"],
    hoursAvailable: 8,
    weeklyAvailability: ["partly", "free", "busy", "free", "free", "busy", "busy"],
    liveChallenges: 0,
  },
];

export function getPeerById(id: string): Peer | undefined {
  return peers.find((p) => p.id === id);
}
