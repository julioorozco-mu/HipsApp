"use client";

import { Clock3, Minus, Plus } from "lucide-react";
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

type ClassFormProps = {
  action: (state: MoreActionState, formData: FormData) => Promise<MoreActionState>;
  defaultCapacity?: number;
  defaultIntervals?: Interval[];
  defaultName?: string;
  defaultWeekdays?: number[];
  multipleIntervals?: boolean;
  multipleWeekdays?: boolean;
  submitLabel: string;
};

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function timeLabel(value: string) {
  const [hourValue, minute] = value.split(":").map(Number);
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function duration({ start, end }: Interval) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function nextInterval(current: Interval[]) {
  const last = current.at(-1) ?? { start: "09:00", end: "10:00" };
  const endIndex = timeOptions.indexOf(last.end);
  const start = timeOptions[Math.min(endIndex + 1, timeOptions.length - 3)] ?? "10:30";
  const startIndex = timeOptions.indexOf(start);
  const end = timeOptions[Math.min(startIndex + 2, timeOptions.length - 1)] ?? "11:30";
  return { start, end };
}

export function ClassForm({
  action,
  defaultCapacity = 25,
  defaultIntervals = [{ start: "09:00", end: "10:00" }],
  defaultName = "",
  defaultWeekdays = [],
  multipleIntervals = true,
  multipleWeekdays = true,
  submitLabel,
}: ClassFormProps) {
  const [intervals, setIntervals] = useState<Interval[]>(defaultIntervals);

  function updateInterval(index: number, field: keyof Interval, value: string) {
    setIntervals((current) =>
      current.map((interval, itemIndex) =>
        itemIndex === index ? { ...interval, [field]: value } : interval
      )
    );
  }

  return (
    <ActionForm action={action} label={submitLabel}>
      <input type="hidden" name="schedules" value={JSON.stringify(intervals)} />

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
                defaultChecked={defaultWeekdays.includes(index)}
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-semibold">Horarios</legend>
          {multipleIntervals ? (
            <button
              type="button"
              onClick={() => setIntervals((current) => [...current, nextInterval(current)])}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary px-3 text-sm font-semibold text-primary"
            >
              <Plus className="size-4" /> Agregar
            </button>
          ) : null}
        </div>

        {intervals.map((interval, index) => {
          const intervalDuration = duration(interval);
          return (
            <div key={index} className="rounded-2xl border p-3">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
                <label className="grid gap-2 text-xs font-semibold text-muted-foreground">
                  Desde
                  <select
                    className={fieldClass}
                    value={interval.start}
                    onChange={(event) => updateInterval(index, "start", event.target.value)}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{timeLabel(time)}</option>
                    ))}
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
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{timeLabel(time)}</option>
                    ))}
                  </select>
                </label>
                {multipleIntervals ? (
                  <button
                    type="button"
                    aria-label="Eliminar horario"
                    disabled={intervals.length === 1}
                    onClick={() =>
                      setIntervals((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="mb-1 grid size-10 place-items-center rounded-full border text-destructive disabled:opacity-30"
                  >
                    <Minus className="size-5" />
                  </button>
                ) : <span />}
              </div>
              <p className={`mt-2 flex items-center gap-2 text-xs ${intervalDuration > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                <Clock3 className="size-4" />
                {intervalDuration > 0
                  ? `Duración calculada: ${intervalDuration} min`
                  : "La hora final debe ser posterior a la inicial."}
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
