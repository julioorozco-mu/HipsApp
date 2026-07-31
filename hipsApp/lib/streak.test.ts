import assert from "node:assert/strict";
import test from "node:test";

import { getMonthlyAttendanceStats } from "./streak.ts";

test("calcula asistencias y mejor racha solo del mes actual", () => {
  const result = getMonthlyAttendanceStats(
    [
      { marked_at: "2026-06-30T18:00:00-06:00", status: "presente" },
      { marked_at: "2026-07-01T18:00:00-06:00", status: "presente" },
      { marked_at: "2026-07-02T18:00:00-06:00", status: "presente" },
      { marked_at: "2026-07-03T18:00:00-06:00", status: "ausente" },
      { marked_at: "2026-07-04T18:00:00-06:00", status: "presente" },
    ],
    new Date("2026-07-30T12:00:00-06:00")
  );

  assert.deepEqual(result, { bestStreak: 2, total: 3 });
});
