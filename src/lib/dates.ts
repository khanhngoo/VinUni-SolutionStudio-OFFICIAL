/**
 * Deadline maths. Seed data is fixed to the 2026 term, so "today" is pinned —
 * otherwise the urgent-deadline card silently stops being urgent.
 */
export const TODAY = new Date("2026-07-27T00:00:00Z");

/**
 * Wall-clock zone for times shown to the student. Fixtures author datetimes in
 * UTC; only the display layer knows about the campus timezone.
 */
export const DISPLAY_TZ = "Asia/Ho_Chi_Minh";

const MS_PER_DAY = 86_400_000;

/** "2026-08-03" — no time component. Datetimes always carry a `T`. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The single entry point for turning fixture strings into dates. Two shapes
 * flow through this module — date-only deadlines and full meeting datetimes —
 * and concatenating `T00:00:00Z` onto the latter produces an Invalid Date, so
 * every consumer normalises here rather than parsing inline.
 */
export function toDate(iso: string): Date {
  return new Date(DATE_ONLY.test(iso) ? `${iso}T00:00:00Z` : iso);
}

/**
 * Whole days between the pinned TODAY and a deadline. Datetimes collapse to
 * their display-timezone day first, so a meeting late in the day is "in 7
 * days", not rounded up to 8.
 */
export function daysUntil(iso: string): number {
  const target = DATE_ONLY.test(iso)
    ? toDate(iso)
    : toDate(`${dayKey(iso)}T00:00:00Z`);
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

/**
 * "27 Jul 2026". Formatted in UTC on purpose: a date-only fixture is a
 * calendar day, not an instant, and re-projecting it into DISPLAY_TZ would
 * shift some of them a day.
 */
export function formatDate(iso: string): string {
  return toDate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "14:00" — the wall-clock time a student would put in their calendar. */
export function formatTime(isoDateTime: string): string {
  return toDate(isoDateTime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TZ,
  });
}

/** "3 Aug 2026 · 14:00". */
export function formatDateTime(isoDateTime: string): string {
  return `${formatDate(dayKey(isoDateTime))} · ${formatTime(isoDateTime)}`;
}

/**
 * "2026-07-27" — which local day something falls on. The agenda groups by this,
 * and it must agree with formatTime, so both read DISPLAY_TZ.
 */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(toDate(iso));
}

/** "Today" / "Tomorrow" / "Mon 3 Aug" — agenda day headings. */
export function dayLabel(isoDay: string): string {
  const today = dayKey(TODAY.toISOString());
  if (isoDay === today) return "Today";
  if (daysUntil(isoDay) === 1) return "Tomorrow";
  return toDate(isoDay).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
