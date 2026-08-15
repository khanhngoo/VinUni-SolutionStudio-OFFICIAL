import { boolean, index, jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";

import { createdAt, fk, id, timestamptz } from "./common";
import { users } from "./users";

export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    consentType: varchar("consent_type", { length: 120 }),
    granted: boolean("granted").notNull(),
    grantedAt: timestamptz("granted_at"),
    revokedAt: timestamptz("revoked_at"),
  },
  (table) => [
    index("consent_records_user_idx").on(table.userId),
    index("consent_records_type_idx").on(table.consentType),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    notificationType: varchar("notification_type", { length: 120 }),
    title: varchar("title", { length: 255 }),
    message: text("message"),
    isRead: boolean("is_read").default(false),
    createdAt: createdAt(),
    readAt: timestamptz("read_at"),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_created_at_idx").on(table.createdAt),
    index("notifications_user_read_created_idx").on(
      table.userId,
      table.isRead,
      table.createdAt
    ),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: fk("user_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    action: varchar("action", { length: 160 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }),
    entityId: fk("entity_id"),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);
