import { pgTable, text, varchar } from "drizzle-orm/pg-core";

import { createdAt, fk, updatedAt } from "./common";
import { users } from "./users";

/**
 * Optional password credential for the explicitly enabled internal-demo
 * self-service provider. Authentication material is deliberately isolated
 * from the application-facing users table and grants no role by itself.
 */
export const userCredentials = pgTable("user_credentials", {
  userId: fk("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordAlgorithm: varchar("password_algorithm", { length: 32 })
    .notNull()
    .default("scrypt-v1"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
