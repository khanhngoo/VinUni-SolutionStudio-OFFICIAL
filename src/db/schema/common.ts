import { bigserial, bigint, numeric, timestamp } from "drizzle-orm/pg-core";

export const id = (name = "id") => bigserial(name, { mode: "bigint" }).primaryKey();

export const fk = (name: string) => bigint(name, { mode: "bigint" });

export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true });

export const createdAt = () => timestamptz("created_at").defaultNow();

export const updatedAt = () => timestamptz("updated_at").defaultNow();

export const normalizedDecimal = (name: string) =>
  numeric(name, { precision: 6, scale: 5, mode: "number" });

export const rubricScore = (name: string) =>
  numeric(name, { precision: 8, scale: 2, mode: "number" });

export const gpaDecimal = (name: string) =>
  numeric(name, { precision: 4, scale: 2, mode: "number" });
