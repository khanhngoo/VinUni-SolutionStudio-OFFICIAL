import { index, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { createdAt, fk, id, updatedAt } from "./common";
import {
  membershipRole,
  membershipStatus,
  organizationType,
  organizationVerificationStatus,
} from "./enums";
import { users } from "./users";

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: varchar("name", { length: 255 }).notNull(),
    organizationType: organizationType("organization_type").notNull(),
    description: text("description"),
    industry: varchar("industry", { length: 255 }),
    verificationStatus:
      organizationVerificationStatus("verification_status").default("PENDING"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("organizations_type_idx").on(table.organizationType),
    index("organizations_verification_status_idx").on(table.verificationStatus),
  ]
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    organizationId: fk("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    role: membershipRole("role").notNull(),
    status: membershipStatus("status").default("ACTIVE"),
    jobTitle: varchar("job_title", { length: 255 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organization_memberships_user_org_role_unique").on(
      table.userId,
      table.organizationId,
      table.role
    ),
    index("organization_memberships_user_idx").on(table.userId),
    index("organization_memberships_organization_idx").on(table.organizationId),
    index("organization_memberships_org_role_status_idx").on(
      table.organizationId,
      table.role,
      table.status
    ),
  ]
);
