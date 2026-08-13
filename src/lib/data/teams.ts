import { peers } from "@/lib/data/peers";
import { currentStudent } from "@/lib/data/student";
import type { InviteStatus, Team, TeamMember, TeamRole } from "@/lib/types";

/**
 * Team fixtures. Every application has one, because a solo application is a
 * team of one — that keeps the pipeline screens from carrying two code paths.
 *
 * Built from the peer directory rather than restated, so a name or an
 * availability change lands everywhere at once.
 */

function leader(role: TeamRole): TeamMember {
  return {
    studentId: currentStudent.id,
    name: currentStudent.name,
    major: currentStudent.major,
    year: currentStudent.year,
    college: currentStudent.college,
    role,
    hoursAvailable: currentStudent.hoursAvailable,
    weeklyAvailability: currentStudent.weeklyAvailability,
    status: "leader",
    invitedAt: null,
  };
}

function member(
  peerId: string,
  role: TeamRole,
  status: InviteStatus,
  invitedAt: string,
): TeamMember {
  const peer = peers.find((p) => p.id === peerId);
  if (!peer) throw new Error(`Unknown peer: ${peerId}`);

  return {
    studentId: peer.id,
    name: peer.name,
    major: peer.major,
    year: peer.year,
    college: peer.college,
    role,
    hoursAvailable: peer.hoursAvailable,
    weeklyAvailability: peer.weeklyAvailability,
    status,
    invitedAt,
  };
}

export function soloTeam(name: string, role: TeamRole = "Data & ML"): Team {
  return { name, members: [leader(role)] };
}

/** app-route — the live example: one invite still outstanding. */
export const lastMileTeam: Team = {
  name: "Last Mile",
  members: [
    leader("Data & ML"),
    member("stu-priya-raman", "Backend", "accepted", "2026-07-24"),
    member("stu-minh-anh", "Domain expert", "invited", "2026-07-25"),
  ],
};

export const churnTeam: Team = {
  name: "Retention Two",
  members: [
    leader("Data & ML"),
    member("stu-priya-raman", "Analysis", "accepted", "2026-07-18"),
  ],
};

export const genzTeam: Team = {
  name: "Signal",
  members: [
    leader("Analysis"),
    member("stu-thao-ha", "Domain expert", "accepted", "2026-07-22"),
    member("stu-linh-pham", "Design", "accepted", "2026-07-22"),
  ],
};

export const heatTeam: Team = {
  name: "Heat Map",
  members: [
    leader("Data & ML"),
    member("stu-hoang-tran", "Research", "accepted", "2026-07-23"),
  ],
};

export const supplyTeam: Team = {
  name: "Warehouse Four",
  members: [
    leader("Data & ML"),
    member("stu-priya-raman", "Backend", "accepted", "2026-06-14"),
    member("stu-minh-anh", "Analysis", "accepted", "2026-06-14"),
  ],
};

export const energyTeam: Team = {
  name: "Kilowatt",
  members: [
    leader("Analysis"),
    member("stu-hoang-tran", "Coordination", "accepted", "2026-04-06"),
  ],
};

export const archiveTeam: Team = {
  name: "Long Record",
  members: [
    leader("Backend"),
    member("stu-linh-pham", "Design", "accepted", "2026-01-08"),
    member("stu-thao-ha", "Research", "accepted", "2026-01-08"),
  ],
};

export const marketTeam: Team = {
  name: "Delta",
  members: [
    leader("Analysis"),
    member("stu-minh-anh", "Domain expert", "accepted", "2026-07-25"),
  ],
};
