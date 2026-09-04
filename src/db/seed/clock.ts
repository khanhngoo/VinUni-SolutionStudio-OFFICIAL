/**
 * The seed's clock.
 *
 * Every fixture date in this directory was authored against a single day,
 * `SEED_ANCHOR`, and the intervals between them carry the demo: a challenge
 * closing in three days, an offer with hours left on it, a milestone overdue
 * while the next one is still open, one meeting running right now and another
 * starting in twenty minutes.
 *
 * Rather than re-derive eighty date literals as offsets, the whole authored
 * timeline is translated forward by the distance between the anchor and the
 * moment the seed actually runs. Intervals are preserved exactly; only the
 * origin moves. Re-seeding therefore refreshes every countdown, and no fixture
 * silently rots into "Closed" the way the pinned clock did.
 *
 * `DELTA_MS` is captured once at module load so that a seed run spanning
 * several seconds cannot shift two rows by different amounts.
 */

/** The day every fixture in `src/db/seed/*` was written against. */
export const SEED_ANCHOR = new Date("2026-07-27T00:00:00.000Z");

/** The instant this seed run started. */
export const SEED_NOW = new Date();

const DELTA_MS = SEED_NOW.getTime() - SEED_ANCHOR.getTime();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Translate an authored instant onto the current timeline. */
export function shift(date: Date): Date {
  return new Date(date.getTime() + DELTA_MS);
}

/**
 * Translate an authored ISO string. Accepts both shapes used in the fixtures —
 * a bare `2026-08-18` calendar day and a full `2026-08-18T16:59:00.000Z`
 * instant — because concatenating a time onto the latter yields Invalid Date.
 */
export function shiftIso(iso: string): Date {
  return shift(new Date(DATE_ONLY.test(iso) ? `${iso}T00:00:00.000Z` : iso));
}

/**
 * Translate an authored calendar day and hand back a calendar day. Postgres
 * `date` columns take strings, and round-tripping them through an instant
 * would let a timezone shift them by one.
 */
export function shiftDateOnly(iso: string): string {
  return shiftIso(iso).toISOString().slice(0, 10);
}

/** Minutes from the moment this run started. Negative is the past. */
export function fromNow(offsetMinutes: number): Date {
  return new Date(SEED_NOW.getTime() + offsetMinutes * 60_000);
}
