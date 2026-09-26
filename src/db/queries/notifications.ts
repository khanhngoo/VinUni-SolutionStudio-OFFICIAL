import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

/** Notices addressed to one user; the caller never supplies another recipient. */
export async function listNotificationsForUser(userId: bigint) {
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}
