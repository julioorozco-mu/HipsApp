"use client";

import { Clock3 } from "lucide-react";
import { useMemo, useState } from "react";

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type DaySchedule = {
  day: number;
  enabled: boolean;
  end: string;
  start: string;
};

const timeOptions = Array.from({ length: 38 }, (_, index) => {
  const minutes = 5 * 60 + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function timeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  return `${hourValue % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function defaults(): DaySchedule[] {
  return dayNames.map((_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start: "07:00",
    end: "21:00",
  }));
}

function parse(value: string | null | undefined) {
  if (!value?.trim().startsWith("[")) return defaults();
  try {
    const parsed = JSON.parse(value) as DaySchedule[];
    if (!Array.isArray(parsed) || parsed.length !== 7) return defaults();
    return defaults().map((fallback) => {
      const saved = parsed.find((item) => item.day === fallback.day);
      return saved
        ? {
            day: fallback.day,
            enabled: Boolean(saved.enabled),
            start: /^\d{2}:\d{2}$/.test(saved.start) ? saved.start : fallback.start,
            end: /^\d{2}:\d{2}$/.test(saved.end) ? saved.end : fallback.end,
          }
        : fallback;
    });
  } catch {
    return defaults();
  }
}

export function BusinessHoursEditor({ defaultValue }: { defaultValue?: string | null }) {
  const initial = useMemo(() => parse(defaultValue), [defaultValue]);
  const [schedule, setSchedule] = useState<DaySchedule[]>(initial);

  function update(day: number, patch: Partial<DaySchedule>) {
    setSchedule((current) =>
      current.map((item) => (item.day === day ? { ...item, ...patch } : item))
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">Horario</legend>
      <input type="hidden" name="business_hours" value={JSON.stringify(schedule)} />
      <p className="text-xs text-muted-foreground">
        Activa los días de servicio y define la hora de apertura y cierre.
      </p>

      <div className="overflow-hidden rounded-2xl border">
        {schedule.map((item) => (
          <div
            key={item.day}
            className="grid gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[7rem_1fr] sm:items-center"
          >
            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(event) => update(item.day, { enabled: event.target.checked })}
                className="size-5 accent-primary"
              />
              {dayNames[item.day]}
            </label>

            <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${item.enabled ? "" : "opacity-40"}`}>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Abre
                <select
                  disabled={!item.enabled}
                  value={item.start}
                  onChange={(event) => update(item.day, { start: event.target.value })}
                  className="min-h-11 min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"
                >
                  {timeOptions.map((time) => <option key={time} value={time}>{timeLabel(time)}</option>)}
                </select>
              </label>
              <Clock3 className="mt-4 size-4 text-muted-foreground" />
              <label className="grid gap-1 text-xs text-muted-foreground">
                Cierra
                <select
                  disabled={!item.enabled}
                  value={item.end}
                  onChange={(event) => update(item.day, { end: event.target.value })}
                  className="min-h-11 min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"
                >
                  {timeOptions.map((time) => <option key={time} value={time}>{timeLabel(time)}</option>)}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
