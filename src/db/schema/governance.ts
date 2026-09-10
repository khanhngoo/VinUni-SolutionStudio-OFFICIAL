import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { createdAt, fk, id, timestamptz, updatedAt } from "./common";
import { platformRole, platformRoleStatus } from "./enums";
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

/**
 * Global platform authority (Phase 6.6), separate from
 * `organizationMemberships`. `role`/`status` are re-read from PostgreSQL on
 * every actor resolution; JWT/session claims are never authoritative. Rows
 * are retained on revocation (`status` flips to `REVOKED`) so administration
 * history stays explainable. `grantedBy` is nullable only for the documented
 * bootstrap/recovery path — ordinary grants must identify the acting owner.
 * The last-ACTIVE-owner invariant is enforced by application logic inside
 * the revocation transaction, not by a database constraint.
 */
export const userPlatformRoles = pgTable(
  "user_platform_roles",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    role: platformRole("role").notNull(),
    status: platformRoleStatus("status").notNull().default("ACTIVE"),
    grantedBy: fk("granted_by").references(() => users.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    grantedAt: timestamptz("granted_at"),
    revokedBy: fk("revoked_by").references(() => users.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    revokedAt: timestamptz("revoked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("user_platform_roles_user_role_unique").on(
      table.userId,
      table.role
    ),
    index("user_platform_roles_role_status_idx").on(table.role, table.status),
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
