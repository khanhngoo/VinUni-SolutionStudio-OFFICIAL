import "dotenv/config";

import {
  applicationDeadlineCampusDate,
  effectiveApplicationDeadline,
  endOfCampusDate,
} from "@/lib/dates";
import { applicationWindow } from "@/services/application.service";

// Phase 6.6.9 P1: a date-only application deadline is open through the end of
// its campus date (Asia/Ho_Chi_Minh, UTC+7). Pure time logic; no DB writes.

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Campus wall-clock time → instant (UTC+7, no daylight saving).
function campus(date: string, time: string) {
  return new Date(`${date}T${time}+07:00`);
}

const status = "APPLICATIONS_OPEN" as const;
const storedForms = {
  "partner form (end of campus day)": endOfCampusDate("2026-11-15"),
  "legacy date-only (00:00 UTC)": new Date("2026-11-15T00:00:00Z"),
  "legacy midday instant": campus("2026-11-15", "12:30:00"),
};

for (const [label, deadline] of Object.entries(storedForms)) {
  assert(
    applicationDeadlineCampusDate(deadline) === "2026-11-15",
    `${label}: displayed campus date should be 2026-11-15`
  );
  assert(
    effectiveApplicationDeadline(deadline).toISOString() === "2026-11-15T16:59:59.999Z",
    `${label}: effective deadline should be 23:59:59.999 campus on 15 Nov`
  );
  for (const time of ["00:00:00", "07:30:00", "12:00:00", "23:59:59"]) {
    const window = applicationWindow(
      { applicationDeadline: deadline, status },
      campus("2026-11-15", time)
    );
    assert(window.isOpen, `${label}: should accept at ${time} campus on the deadline date`);
  }
  for (const [date, time] of [
    ["2026-11-16", "00:00:00"],
    ["2026-11-16", "12:00:00"],
  ]) {
    const window = applicationWindow(
      { applicationDeadline: deadline, status },
      campus(date, time)
    );
    assert(
      !window.isOpen && window.reason === "DEADLINE_PASSED",
      `${label}: should reject at ${date} ${time} campus`
    );
  }
}

assert(
  applicationDeadlineCampusDate(new Date("2026-10-21T19:05:34.576Z")) === "2026-10-22",
  "an instant after 17:00 UTC belongs to the next campus date"
);

console.log("Phase 6.6.9 application deadline (end of campus date) verification passed.");
process.exit(0);
