"use client";

import { Clock3, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type ScheduleInterval = {
  id: string;
  end: string;
  start: string;
};

type DaySchedule = {
  day: number;
  enabled: boolean;
  intervals: ScheduleInterval[];
};

type StoredDaySchedule = {
  day: number;
  enabled: boolean;
  end?: string;
  intervals?: Array<{ end: string; start: string }>;
  start?: string;
};

const timeOptions = Array.from({ length: 38 }, (_, index) => {
  const totalMinutes = 5 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function intervalId(day: number, index: number) {
  return `${day}-${index}-${Date.now()}`;
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  return `${hourValue % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function defaultInterval(day: number, index = 0): ScheduleInterval {
  return {
    id: intervalId(day, index),
    start: "07:00",
    end: "09:00",
  };
}

function defaults(): DaySchedule[] {
  return dayNames.map((_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    intervals: [
      {
        ...defaultInterval(day),
        end: "21:00",
      },
    ],
  }));
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function parse(value: string | null | undefined) {
  if (!value?.trim().startsWith("[")) return defaults();

  try {
    const parsed = JSON.parse(value) as StoredDaySchedule[];
    if (!Array.isArray(parsed)) return defaults();

    return defaults().map((fallback) => {
      const saved = parsed.find((item) => item.day === fallback.day);
      if (!saved) return fallback;

      const storedIntervals = Array.isArray(saved.intervals)
        ? saved.intervals
        : validTime(saved.start) && validTime(saved.end)
          ? [{ start: saved.start, end: saved.end }]
          : [];
      const intervals = storedIntervals.flatMap((interval, index) =>
        validTime(interval.start) && validTime(interval.end)
          ? [
              {
                id: intervalId(fallback.day, index),
                start: interval.start,
                end: interval.end,
              },
            ]
          : []
      );

      return {
        day: fallback.day,
        enabled: Boolean(saved.enabled),
        intervals: intervals.length ? intervals : [defaultInterval(fallback.day)],
      };
    });
  } catch {
    return defaults();
  }
}

function hasConflict(item: DaySchedule) {
  if (!item.enabled) return false;
  const sorted = [...item.intervals].sort(
    (left, right) => minutes(left.start) - minutes(right.start)
  );

  return sorted.some((interval, index) => {
    if (minutes(interval.end) <= minutes(interval.start)) return true;
    const next = sorted[index + 1];
    return Boolean(next && minutes(interval.end) > minutes(next.start));
  });
}

export function BusinessHoursEditor({ defaultValue }: { defaultValue?: string | null }) {
  const initial = useMemo(() => parse(defaultValue), [defaultValue]);
  const [schedule, setSchedule] = useState<DaySchedule[]>(initial);

  const serialized = JSON.stringify(
    schedule.map((item) => ({
      day: item.day,
      enabled: item.enabled,
      intervals: item.intervals.map(({ start, end }) => ({ start, end })),
    }))
  );

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((current) =>
      current.map((item) => (item.day === day ? { ...item, ...patch } : item))
    );
  }

  function updateInterval(
    day: number,
    id: string,
    patch: Partial<Pick<ScheduleInterval, "start" | "end">>
  ) {
    setSchedule((current) =>
      current.map((item) =>
        item.day === day
          ? {
              ...item,
              intervals: item.intervals.map((interval) =>
                interval.id === id ? { ...interval, ...patch } : interval
              ),
            }
          : item
      )
    );
  }

  function addInterval(day: number) {
    setSchedule((current) =>
      current.map((item) => {
        if (item.day !== day) return item;
        const previous = item.intervals.at(-1);
        const start = previous?.end && previous.end < "22:00" ? previous.end : "18:00";
        const endMinutes = Math.min(minutes(start) + 120, 23 * 60 + 30);
        const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(
          endMinutes % 60
        ).padStart(2, "0")}`;

        return {
          ...item,
          enabled: true,
          intervals: [
            ...item.intervals,
            {
              id: intervalId(day, item.intervals.length),
              start,
              end,
            },
          ],
        };
      })
    );
  }

  function removeInterval(day: number, id: string) {
    setSchedule((current) =>
      current.map((item) => {
        if (item.day !== day) return item;
        const remaining = item.intervals.filter((interval) => interval.id !== id);
        return {
          ...item,
          enabled: remaining.length ? item.enabled : false,
          intervals: remaining.length ? remaining : [defaultInterval(day)],
        };
      })
    );
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">Horario</legend>
      <input type="hidden" name="business_hours" value={serialized} />
      <p className="text-xs leading-5 text-muted-foreground">
        Define uno o varios turnos por día. Los intervalos del mismo día no pueden
        superponerse.
      </p>

      <div className="grid gap-3">
        {schedule.map((item) => {
          const invalid = hasConflict(item);
          return (
            <section key={item.day} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      updateDay(item.day, { enabled: event.target.checked })
                    }
                    className="size-5 accent-primary"
                  />
                  {dayNames[item.day]}
                </label>
                <button
                  type="button"
                  onClick={() => addInterval(item.day)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary px-3 text-sm font-semibold text-primary disabled:opacity-40"
                >
                  <Plus className="size-4" /> Agregar
                </button>
              </div>

              <div className={`mt-4 grid gap-3 ${item.enabled ? "" : "opacity-45"}`}>
                {item.intervals.map((interval, index) => (
                  <div
                    key={interval.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_2.75rem] items-end gap-2 rounded-xl bg-secondary/60 p-3"
                  >
                    <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                      Inicio {index + 1}
                      <select
                        disabled={!item.enabled}
                        value={interval.start}
                        onChange={(event) =>
                          updateInterval(item.day, interval.id, {
                            start: event.target.value,
                          })
                        }
                        className="min-h-11 min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {timeLabel(time)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Clock3 className="mb-3 size-4 text-muted-foreground" />
                    <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                      Fin {index + 1}
                      <select
                        disabled={!item.enabled}
                        value={interval.end}
                        onChange={(event) =>
                          updateInterval(item.day, interval.id, {
                            end: event.target.value,
                          })
                        }
                        className="min-h-11 min-w-0 rounded-xl border bg-card px-2 text-sm text-foreground"
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {timeLabel(time)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={!item.enabled}
                      onClick={() => removeInterval(item.day, interval.id)}
                      aria-label={`Eliminar intervalo ${index + 1} de ${dayNames[item.day]}`}
                      className="grid size-11 place-items-center rounded-xl border border-destructive/35 text-destructive disabled:opacity-40"
                    >
                      <Minus className="size-5" />
                    </button>
                  </div>
                ))}
              </div>

              {invalid ? (
                <p className="mt-3 text-xs font-medium text-destructive">
                  Corrige los intervalos: la hora final debe ser posterior y no debe
                  cruzarse con otro turno.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </fieldset>
  );
}
