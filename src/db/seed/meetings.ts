import { eq } from "drizzle-orm";

import { meetingAttendees, meetings, projectMembers } from "../schema";
import type { SeedContext } from "./context";
import { fromNow } from "./clock";

type MeetingKind =
  | "KICKOFF"
  | "WEEKLY_SYNC"
  | "SUPERVISOR_ONE_ON_ONE"
  | "MILESTONE_REVIEW"
  | "FINAL_PRESENTATION";

interface DemoMeetingSeed {
  durationMinutes: number;
  joinUrl: string;
  kind: MeetingKind;
  /** Milestone this meeting reviews, keyed within its project. */
  milestoneKey: string | null;
  /** Minutes from the seed run instant. Negative is past. */
  offsetMinutes: number;
  publicId: string;
  title: string;
  /** Attendees beyond the team itself. */
  withSupervisor: boolean;
}

interface DemoProjectMeetingsSeed {
  meetings: DemoMeetingSeed[];
  projectKey: string;
  supervisorUserKey: string;
}

/**
 * The clock these fixtures were authored against.
 *
 * Every offset below is relative to this instant, never a pasted ISO string.
 * That is deliberate: the original fixtures encoded a meeting that is live
 * right now and another starting in twenty minutes, and those states only
 * exist because the timestamps sit either side of the same pin that
 * `lib/dates.ts` uses. Hard-coding the strings would quietly turn both into
 * history the moment the pin moved.
 *
 */
// The run clock is shared with every other seeder via ./clock, so the live
// meeting and the starts-in-20-minutes meeting stay aligned with the shifted
// challenge deadlines and offer windows rather than drifting against them.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function at(offsetMinutes: number) {
  return fromNow(offsetMinutes);
}

/**
 * Offsets are chosen so each meeting lands between 00:00Z and 17:00Z, keeping
 * the UTC instant and the Asia/Ho_Chi_Minh calendar day on the same date — an
 * 18:00Z meeting would file itself under the following day's agenda heading.
 */
const DEMO_PROJECT_MEETINGS: DemoProjectMeetingsSeed[] = [
  {
    projectKey: "project:app-supply",
    supervisorUserKey: "user:fac-pham",
    meetings: [
      {
        publicId: "66666666-6666-4666-8666-000000000001",
        title: "Kickoff with the analytics team",
        kind: "KICKOFF",
        offsetMinutes: -(34 * DAY - 2 * HOUR) / MINUTE,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/supply-chain-kickoff",
        milestoneKey: null,
        withSupervisor: true,
      },
      {
        // Started fifteen minutes before the pin and runs forty-five: live now.
        publicId: "66666666-6666-4666-8666-000000000002",
        title: "Weekly sync with the analytics team",
        kind: "WEEKLY_SYNC",
        offsetMinutes: -15,
        durationMinutes: 45,
        joinUrl: "https://meet.vinuni.edu.vn/supply-chain-weekly",
        milestoneKey: null,
        withSupervisor: false,
      },
      {
        publicId: "66666666-6666-4666-8666-000000000003",
        title: "Supervisor 1:1 — schema revision",
        kind: "SUPERVISOR_ONE_ON_ONE",
        offsetMinutes: (3 * DAY + 7 * HOUR) / MINUTE,
        durationMinutes: 30,
        joinUrl: "https://meet.vinuni.edu.vn/pham-office-hours",
        milestoneKey: null,
        withSupervisor: true,
      },
      {
        publicId: "66666666-6666-4666-8666-000000000004",
        title: "Forecast module review",
        kind: "MILESTONE_REVIEW",
        offsetMinutes: (7 * DAY + 3 * HOUR) / MINUTE,
        durationMinutes: 45,
        joinUrl: "https://meet.vinuni.edu.vn/supply-chain-ms3",
        milestoneKey: "ms-3",
        withSupervisor: true,
      },
    ],
  },
  {
    projectKey: "project:app-energy",
    supervisorUserKey: "user:fac-vu",
    meetings: [
      {
        publicId: "66666666-6666-4666-8666-000000000005",
        title: "Kickoff with facilities",
        kind: "KICKOFF",
        offsetMinutes: -(104 * DAY - 2 * HOUR) / MINUTE,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/energy-kickoff",
        milestoneKey: null,
        withSupervisor: true,
      },
      {
        // Twenty minutes out — the "starts soon" state on the agenda rail.
        publicId: "66666666-6666-4666-8666-000000000006",
        title: "Reduction plan review",
        kind: "MILESTONE_REVIEW",
        offsetMinutes: 20,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/energy-ms3",
        milestoneKey: "ms-e3",
        withSupervisor: true,
      },
      {
        publicId: "66666666-6666-4666-8666-000000000007",
        title: "Final presentation to the capital planning group",
        kind: "FINAL_PRESENTATION",
        offsetMinutes: (9 * DAY + 4 * HOUR) / MINUTE,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/energy-final",
        milestoneKey: null,
        withSupervisor: true,
      },
    ],
  },
  {
    projectKey: "project:app-archive",
    supervisorUserKey: "user:fac-nguyen-k",
    meetings: [
      {
        publicId: "66666666-6666-4666-8666-000000000008",
        title: "Kickoff with the archive team",
        kind: "KICKOFF",
        offsetMinutes: -(195 * DAY - 2 * HOUR) / MINUTE,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/archive-kickoff",
        milestoneKey: null,
        withSupervisor: true,
      },
      {
        publicId: "66666666-6666-4666-8666-000000000009",
        title: "Metadata schema review",
        kind: "MILESTONE_REVIEW",
        offsetMinutes: -(112 * DAY - 3 * HOUR) / MINUTE,
        durationMinutes: 45,
        joinUrl: "https://meet.vinuni.edu.vn/archive-ms2",
        milestoneKey: "ms-a2",
        withSupervisor: true,
      },
      {
        publicId: "66666666-6666-4666-8666-000000000010",
        title: "Final handover presentation",
        kind: "FINAL_PRESENTATION",
        offsetMinutes: -(62 * DAY - 3 * HOUR) / MINUTE,
        durationMinutes: 60,
        joinUrl: "https://meet.vinuni.edu.vn/archive-final",
        milestoneKey: null,
        withSupervisor: true,
      },
    ],
  },
];

export async function seedDemoMeetings(ctx: SeedContext) {
  let meetingCount = 0;
  let attendeeCount = 0;

  for (const project of DEMO_PROJECT_MEETINGS) {
    const projectId = ctx.getId(project.projectKey);

    // Attendees come from the project's actual membership rather than from
    // names in the fixture: a meeting attendee must be a real seeded user, and
    // inventing one to match a fixture string would put a person in the
    // database who exists nowhere else.
    const members = await ctx.tx
      .select({ studentId: projectMembers.studentId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const supervisorId = ctx.getId(project.supervisorUserKey);

    for (const seed of project.meetings) {
      const [meeting] = await ctx.tx
        .insert(meetings)
        .values({
          durationMinutes: seed.durationMinutes,
          joinUrl: seed.joinUrl,
          kind: seed.kind,
          milestoneId: seed.milestoneKey
            ? ctx.getId(`${project.projectKey}:milestone:${seed.milestoneKey}`)
            : null,
          projectId,
          publicId: seed.publicId,
          startsAt: at(seed.offsetMinutes),
          title: seed.title,
        })
        .onConflictDoUpdate({
          target: meetings.publicId,
          set: {
            durationMinutes: seed.durationMinutes,
            joinUrl: seed.joinUrl,
            kind: seed.kind,
            startsAt: at(seed.offsetMinutes),
            title: seed.title,
            updatedAt: new Date(),
          },
        })
        .returning({ id: meetings.id });

      meetingCount += 1;

      const attendees = [
        ...members.map((member) => ({
          attendeeRole: "Team member",
          userId: member.studentId,
        })),
        ...(seed.withSupervisor
          ? [{ attendeeRole: "Faculty supervisor", userId: supervisorId }]
          : []),
      ];

      for (const attendee of attendees) {
        await ctx.tx
          .insert(meetingAttendees)
          .values({ ...attendee, meetingId: meeting.id })
          .onConflictDoUpdate({
            target: [meetingAttendees.meetingId, meetingAttendees.userId],
            set: { attendeeRole: attendee.attendeeRole },
          });
        attendeeCount += 1;
      }
    }
  }

  ctx.record("DEMO", "meetings", meetingCount);
  ctx.record("DEMO", "meeting attendees", attendeeCount);
}
