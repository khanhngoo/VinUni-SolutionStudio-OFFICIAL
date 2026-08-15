import type { Meeting } from "@/lib/types";

/**
 * Scheduled contact for the three projects that have reached ACTIVE or beyond.
 *
 * Every time here is authored relative to the pinned clock in `lib/dates.ts`
 * (`TODAY = 2026-07-27T00:00:00Z`), which is what makes the live-now and
 * starts-in-20-minutes states reachable at all. Repointing TODAY at the wall
 * clock silently turns all of them into ancient history.
 *
 * `startsAt` values stay inside 00:00Z–17:00Z so the UTC instant and the
 * Asia/Ho_Chi_Minh calendar day agree — an 18:00Z meeting would file itself
 * under the following day's agenda heading.
 */

const STUDENT = { name: "Jordan Lee", role: "You" };

/** app-supply (ACTIVE) — a weekly sync that is running right now. */
export const supplyMeetings: Meeting[] = [
  {
    id: "mtg-supply-1",
    title: "Kickoff with the analytics team",
    kind: "Kickoff",
    startsAt: "2026-06-23T02:00:00Z",
    durationMinutes: 60,
    joinUrl: "https://meet.vinuni.edu.vn/supply-chain-kickoff",
    attendees: [
      STUDENT,
      { name: "Dr. Minh Pham", role: "Faculty supervisor" },
      { name: "Mai Tran", role: "Head of Supply Chain Analytics" },
    ],
  },
  {
    id: "mtg-supply-2",
    title: "Weekly sync with the analytics team",
    kind: "Weekly sync",
    // Started 15 minutes before the pin and runs 45 — live at TODAY.
    startsAt: "2026-07-26T23:45:00Z",
    durationMinutes: 45,
    joinUrl: "https://meet.vinuni.edu.vn/supply-chain-weekly",
    attendees: [STUDENT, { name: "Mai Tran", role: "Partner lead" }],
  },
  {
    id: "mtg-supply-3",
    title: "Supervisor 1:1 — schema revision",
    kind: "Supervisor 1:1",
    startsAt: "2026-07-30T07:00:00Z",
    durationMinutes: 30,
    joinUrl: "https://meet.vinuni.edu.vn/pham-office-hours",
    attendees: [STUDENT, { name: "Dr. Minh Pham", role: "Faculty supervisor" }],
  },
  {
    id: "mtg-supply-4",
    title: "Forecast module review",
    kind: "Milestone review",
    startsAt: "2026-08-03T03:00:00Z",
    durationMinutes: 45,
    joinUrl: "https://meet.vinuni.edu.vn/supply-chain-ms3",
    attendees: [
      STUDENT,
      { name: "Dr. Minh Pham", role: "Faculty supervisor" },
      { name: "Mai Tran", role: "Partner lead" },
    ],
    milestoneId: "ms-3",
  },
];

/** app-energy (IN_REVIEW) — a review starting in twenty minutes. */
export const energyMeetings: Meeting[] = [
  {
    id: "mtg-energy-1",
    title: "Kickoff — scope and building access",
    kind: "Kickoff",
    startsAt: "2026-04-14T02:00:00Z",
    durationMinutes: 60,
    joinUrl: "https://meet.vinuni.edu.vn/energy-audit-kickoff",
    attendees: [
      STUDENT,
      { name: "Dr. Lan Vu", role: "Faculty supervisor" },
      { name: "Dr. Hoang Vu", role: "Director, Campus Sustainability" },
    ],
  },
  {
    id: "mtg-energy-2",
    // 20 minutes after the pin.
    title: "Retrofit report review",
    kind: "Milestone review",
    startsAt: "2026-07-27T00:20:00Z",
    durationMinutes: 60,
    joinUrl: "https://meet.vinuni.edu.vn/energy-audit-review",
    attendees: [
      STUDENT,
      { name: "Dr. Lan Vu", role: "Faculty supervisor" },
      { name: "Dr. Hoang Vu", role: "Partner lead" },
    ],
    milestoneId: "ms-e3",
  },
  {
    id: "mtg-energy-3",
    title: "Final presentation to the sustainability office",
    kind: "Final presentation",
    startsAt: "2026-08-05T04:00:00Z",
    durationMinutes: 45,
    joinUrl: "https://meet.vinuni.edu.vn/energy-audit-final",
    attendees: [
      STUDENT,
      { name: "Dr. Lan Vu", role: "Faculty supervisor" },
      { name: "Dr. Hoang Vu", role: "Director, Campus Sustainability" },
    ],
  },
];

/** app-archive (COMPLETED) — all in the past, so nothing is ever "next". */
export const archiveMeetings: Meeting[] = [
  {
    id: "mtg-archive-1",
    title: "Kickoff — digitisation scope",
    kind: "Kickoff",
    startsAt: "2026-01-13T02:00:00Z",
    durationMinutes: 60,
    joinUrl: "https://meet.vinuni.edu.vn/archive-kickoff",
    attendees: [
      STUDENT,
      { name: "Dr. Bao Tran", role: "Faculty supervisor" },
      { name: "Dr. Bao Tran", role: "University Librarian" },
    ],
  },
  {
    id: "mtg-archive-2",
    title: "Metadata mapping review",
    kind: "Milestone review",
    startsAt: "2026-04-06T03:00:00Z",
    durationMinutes: 45,
    joinUrl: "https://meet.vinuni.edu.vn/archive-ms2",
    attendees: [STUDENT, { name: "Dr. Bao Tran", role: "Faculty supervisor" }],
    milestoneId: "ms-a2",
  },
  {
    id: "mtg-archive-3",
    title: "Final presentation to the library board",
    kind: "Final presentation",
    startsAt: "2026-05-26T03:00:00Z",
    durationMinutes: 45,
    joinUrl: "https://meet.vinuni.edu.vn/archive-final",
    attendees: [
      STUDENT,
      { name: "Dr. Bao Tran", role: "Faculty supervisor" },
      { name: "Dr. Bao Tran", role: "University Librarian" },
    ],
  },
];
