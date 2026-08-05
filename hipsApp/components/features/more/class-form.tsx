"use client";

import { Clock3, Minus, Music2, Plus } from "lucide-react";
import { useState } from "react";

import type { MoreActionState } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";

const days = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type Interval = { end: string; start: string };
type KeyedInterval = Interval & { key: string };

export type ClassOccupiedSchedule = {
  end: string;
  name: string;
  start: string;
  weekday: number;
};

export type ClassPlaylistOption = {
  id: string;
  name: string;
  trackCount: number;
};

type ClassFormProps = {
  action: (state: MoreActionState, formData: FormData) => Promise<MoreActionState>;
  defaultCapacity?: number;
  defaultIntervals?: Interval[];
  defaultName?: string;
  defaultPlaylistId?: string | null;
  defaultWeekdays?: number[];
  multipleIntervals?: boolean;
  multipleWeekdays?: boolean;
  occupiedSchedules?: ClassOccupiedSchedule[];
  playlists?: ClassPlaylistOption[];
  submitLabel: string;
};

const startTimeOptions = Array.from({ length: 48 }, (_, index) =>
  formatMinutes(index * 30)
);
const endTimeOptions = Array.from({ length: 48 }, (_, index) =>
  formatMinutes((index + 1) * 30)
);

function formatMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(value: string) {
  const total = minutes(value);
  if (total === 24 * 60) return "12:00 a. m. (día siguiente)";
  const hourValue = Math.floor(total / 60);
  const minute = total % 60;
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function duration({ start, end }: Interval) {
  return minutes(end) - minutes(start);
}

function overlaps(left: Interval, right: Interval) {
  return minutes(left.start) < minutes(right.end) && minutes(left.end) > minutes(right.start);
}

function oneHourLater(start: string) {
  const total = minutes(start) + 60;
  return total <= 24 * 60 ? formatMinutes(total) : null;
}

function selectedScheduleDays(selectedWeekdays: number[]) {
  return selectedWeekdays.length ? selectedWeekdays : [];
}

function startConflict(
  start: string,
  index: number,
  intervals: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
) {
  const end = oneHourLater(start);
  if (!end) return "Fuera del horario del día";
  const candidate = { start, end };
  const selectedDays = selectedScheduleDays(selectedWeekdays);

  const occupied = occupiedSchedules.find(
    (schedule) =>
      selectedDays.includes(schedule.weekday) && overlaps(candidate, schedule)
  );
  if (occupied) return occupied.name;

  const local = intervals.find(
    (interval, itemIndex) => itemIndex !== index && overlaps(candidate, interval)
  );
  return local ? "Otro horario de esta clase" : null;
}

function endConflict(
  end: string,
  index: number,
  intervals: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
) {
  const candidate = { start: intervals[index].start, end };
  if (duration(candidate) <= 0) return "Debe ser posterior al inicio";
  const selectedDays = selectedScheduleDays(selectedWeekdays);

  const occupied = occupiedSchedules.find(
    (schedule) =>
      selectedDays.includes(schedule.weekday) && overlaps(candidate, schedule)
  );
  if (occupied) return occupied.name;

  const local = intervals.find(
    (interval, itemIndex) => itemIndex !== index && overlaps(candidate, interval)
  );
  return local ? "Otro horario de esta clase" : null;
}

function actualConflict(
  interval: Interval,
  index: number,
  intervals: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
) {
  if (duration(interval) <= 0) return "La hora final debe ser posterior a la inicial.";
  const selectedDays = selectedScheduleDays(selectedWeekdays);
  const occupied = occupiedSchedules.find(
    (schedule) =>
      selectedDays.includes(schedule.weekday) && overlaps(interval, schedule)
  );
  if (occupied) return `Se cruza con “${occupied.name}”.`;
  if (
    intervals.some(
      (other, itemIndex) => itemIndex !== index && overlaps(interval, other)
    )
  ) {
    return "Se cruza con otro horario de esta clase.";
  }
  return null;
}

function orderedStartOptions(from: string) {
  const firstIndex = startTimeOptions.findIndex(
    (time) => minutes(time) >= minutes(from)
  );
  const index = firstIndex < 0 ? 0 : firstIndex;
  return [
    ...startTimeOptions.slice(index),
    ...startTimeOptions.slice(0, index),
  ];
}

function findAvailableInterval(
  from: string,
  current: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
): Interval | null {
  for (const start of orderedStartOptions(from)) {
    const end = oneHourLater(start);
    if (
      end &&
      !startConflict(
        start,
        current.length,
        current,
        selectedWeekdays,
        occupiedSchedules
      )
    ) {
      return { start, end };
    }
  }
  return null;
}

function reconcileIntervals(
  current: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
) {
  return current.reduce<Interval[]>((resolved, interval) => {
    const candidateIntervals = [...resolved, interval];
    const conflict = actualConflict(
      interval,
      resolved.length,
      candidateIntervals,
      selectedWeekdays,
      occupiedSchedules
    );

    if (!conflict) {
      resolved.push(interval);
      return resolved;
    }

    resolved.push(
      findAvailableInterval(
        interval.start,
        resolved,
        selectedWeekdays,
        occupiedSchedules
      ) ?? interval
    );
    return resolved;
  }, []);
}

function nextInterval(
  current: Interval[],
  selectedWeekdays: number[],
  occupiedSchedules: ClassOccupiedSchedule[]
) {
  return findAvailableInterval(
    current.at(-1)?.end ?? "00:00",
    current,
    selectedWeekdays,
    occupiedSchedules
  );
}

export function ClassForm({
  action,
  defaultCapacity = 25,
  defaultIntervals = [{ start: "09:00", end: "10:00" }],
  defaultName = "",
  defaultPlaylistId = null,
  defaultWeekdays = [],
  multipleIntervals = true,
  multipleWeekdays = true,
  occupiedSchedules = [],
  playlists = [],
  submitLabel,
}: ClassFormProps) {
  const [intervals, setIntervals] = useState<KeyedInterval[]>(() =>
    defaultIntervals.map((interval) => ({ ...interval, key: crypto.randomUUID() }))
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(defaultWeekdays);
  const availableNextInterval = nextInterval(
    intervals,
    selectedWeekdays,
    occupiedSchedules
  );

  function updateInterval(index: number, field: keyof Interval, value: string) {
    setIntervals((current) =>
      current.map((interval, itemIndex) => {
        if (itemIndex !== index) return interval;
        if (field === "start") {
          return { ...interval, start: value, end: oneHourLater(value) ?? interval.end };
        }
        return { ...interval, end: value };
      })
    );
  }

  function toggleWeekday(index: number) {
    const nextWeekdays = !multipleWeekdays
      ? [index]
      : selectedWeekdays.includes(index)
        ? selectedWeekdays.filter((day) => day !== index)
        : [...selectedWeekdays, index].sort();

    setSelectedWeekdays(nextWeekdays);
    setIntervals((current) =>
      reconcileIntervals(current, nextWeekdays, occupiedSchedules).map(
        (interval, itemIndex) => ({ ...interval, key: current[itemIndex].key })
      )
    );
  }

  return (
    <ActionForm action={action} label={submitLabel}>
      <input
        type="hidden"
        name="schedules"
        value={JSON.stringify(intervals.map(({ end, start }) => ({ end, start })))}
      />

      <label className="grid gap-2 text-sm font-semibold">
        Nombre de la clase
        <input
          className={fieldClass}
          name="name"
          defaultValue={defaultName}
          placeholder="Zumba prueba"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Music2 className="size-4 text-primary" />
          Playlist predeterminada
        </span>
        <select
          className={fieldClass}
          name="playlist_id"
          defaultValue={defaultPlaylistId ?? ""}
        >
          <option value="">Sin playlist asignada</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name} · {playlist.trackCount} canciones
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-muted-foreground">
          Se propondrá al finalizar cada sesión. Puedes cambiarla solo para ese día.
        </span>
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">
          {multipleWeekdays ? "Días" : "Día"}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {days.map((day, index) => (
            <label
              key={day}
              className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type={multipleWeekdays ? "checkbox" : "radio"}
                name="weekday"
                value={index}
                checked={selectedWeekdays.includes(index)}
                onChange={() => toggleWeekday(index)}
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <legend className="text-sm font-semibold">Horarios</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Se propone el siguiente bloque libre y el término se calcula una hora después.
            </p>
          </div>
          {multipleIntervals ? (
            <button
              type="button"
              disabled={!availableNextInterval}
              onClick={() => {
                if (!availableNextInterval) return;
                setIntervals((current) => [
                  ...current,
                  { ...availableNextInterval, key: crypto.randomUUID() },
                ]);
              }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-primary px-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" /> Agregar
            </button>
          ) : null}
        </div>

        {intervals.map((interval, index) => {
          const intervalDuration = duration(interval);
          const conflict = actualConflict(
            interval,
            index,
            intervals,
            selectedWeekdays,
            occupiedSchedules
          );
          return (
            <div key={interval.key} className="rounded-2xl border p-3">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
                <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
                  Desde
                  <select
                    className={fieldClass}
                    value={interval.start}
                    onChange={(event) => updateInterval(index, "start", event.target.value)}
                  >
                    {startTimeOptions.map((time) => {
                      const unavailable = startConflict(
                        time,
                        index,
                        intervals,
                        selectedWeekdays,
                        occupiedSchedules
                      );
                      return (
                        <option key={time} value={time} disabled={Boolean(unavailable)}>
                          {timeLabel(time)}{unavailable ? " · Ocupado" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <span className="pb-3 text-muted-foreground">–</span>
                <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
                  Hasta
                  <select
                    className={fieldClass}
                    value={interval.end}
                    onChange={(event) => updateInterval(index, "end", event.target.value)}
                  >
                    {endTimeOptions.map((time) => {
                      const unavailable = endConflict(
                        time,
                        index,
                        intervals,
                        selectedWeekdays,
                        occupiedSchedules
                      );
                      return (
                        <option key={time} value={time} disabled={Boolean(unavailable)}>
                          {timeLabel(time)}{unavailable ? " · No disponible" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {multipleIntervals ? (
                  <button
                    type="button"
                    aria-label="Eliminar horario"
                    disabled={intervals.length === 1}
                    onClick={() =>
                      setIntervals((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    className="mb-1 grid size-10 place-items-center rounded-full border text-destructive disabled:opacity-30"
                  >
                    <Minus className="size-5" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
              <p
                className={`mt-2 flex items-center gap-2 text-xs ${
                  conflict ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <Clock3 className="size-4" />
                {conflict ?? `Duración calculada: ${intervalDuration} min`}
              </p>
            </div>
          );
        })}
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold">
        Cupo máximo
        <input
          className={fieldClass}
          name="capacity"
          type="number"
          min="1"
          max="500"
          defaultValue={defaultCapacity}
          required
        />
      </label>
    </ActionForm>
  );
}
