import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { createdAt, fk, id, timestamptz, updatedAt } from "./common";
import { meetingKind } from "./enums";
import { milestones, projects } from "./projects";
import { users } from "./users";

/**
 * Scheduled contact on a live project.
 *
 * `externalProvider` / `externalProviderId` are nullable so a row can later be
 * backed by a real Teams, Zoom or Meet event without another migration: the
 * platform owns the schedule, the provider owns the call. Until that
 * integration exists, `joinUrl` alone carries the link.
 */
export const meetings = pgTable(
  "meetings",
  {
    id: id(),
    publicId: uuid("public_id").defaultRandom().notNull(),
    projectId: fk("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    /**
     * Set when the meeting exists to review one milestone. That is what lets
     * the milestone list show its own review slot inline.
     */
    milestoneId: fk("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    kind: meetingKind("kind").notNull(),
    startsAt: timestamptz("starts_at").notNull(),
    durationMinutes: integer("duration_minutes"),
    joinUrl: text("join_url"),
    externalProvider: varchar("external_provider", { length: 80 }),
    externalProviderId: varchar("external_provider_id", { length: 255 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("meetings_public_id_unique").on(table.publicId),
    index("meetings_project_idx").on(table.projectId),
    index("meetings_milestone_idx").on(table.milestoneId),
    index("meetings_starts_at_idx").on(table.startsAt),
    index("meetings_project_starts_at_idx").on(table.projectId, table.startsAt),
    check(
      "meetings_duration_positive",
      sql`${table.durationMinutes} IS NULL OR ${table.durationMinutes} > 0`
    ),
  ]
);

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: id(),
    meetingId: fk("meeting_id")
      .notNull()
      .references(() => meetings.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    /** How this person is attending — supervisor, partner lead, team member. */
    attendeeRole: varchar("attendee_role", { length: 120 }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("meeting_attendees_meeting_user_unique").on(
      table.meetingId,
      table.userId
    ),
    index("meeting_attendees_user_idx").on(table.userId),
  ]
);
