type AttendanceRow = {
  marked_at: string;
  status: "presente" | "ausente";
};

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "2-digit",
  timeZone: "America/Mexico_City",
  year: "numeric",
});

function monthKey(date: Date) {
  const parts = monthFormatter.formatToParts(date);
  const year = parts.find(({ type }) => type === "year")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  return `${year}-${month}`;
}

export function getMonthlyAttendanceStats(
  attendance: AttendanceRow[],
  now = new Date()
) {
  let current = 0;
  let bestStreak = 0;
  let total = 0;
  const currentMonth = monthKey(now);

  // ponytail: one student's history is small; aggregate in SQL if it becomes large.
  for (const row of attendance) {
    if (monthKey(new Date(row.marked_at)) !== currentMonth) continue;
    if (row.status === "ausente") {
      current = 0;
      continue;
    }
    total += 1;
    current += 1;
    bestStreak = Math.max(bestStreak, current);
  }

  return { bestStreak, total };
}
