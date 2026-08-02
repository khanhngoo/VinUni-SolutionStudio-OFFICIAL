/**
 * Deadline maths. Seed data is fixed to the 2026 term, so "today" is pinned —
 * otherwise the urgent-deadline card silently stops being urgent.
 */
export const TODAY = new Date("2026-07-27T00:00:00Z");

const MS_PER_DAY = 86_400_000;

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00Z`);
  return Math.round((target.getTime() - TODAY.getTime()) / MS_PER_DAY);
}

/** "Closes in 16 days" / "Closes in 3 days" / "Closes today" / "Closed". */
export function deadlineLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}

/** Under a week left reads as urgent and gets the warn treatment. */
export function isUrgent(isoDate: string): boolean {
  const days = daysUntil(isoDate);
  return days >= 0 && days <= 7;
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
