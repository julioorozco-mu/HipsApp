"use client";

import { useState } from "react";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function pad(value: string) {
  return value.padStart(2, "0");
}

function getDayLimit(year: string, month: string) {
  if (!month) return 31;
  const resolvedYear = year ? Number(year) : 2024;
  return new Date(resolvedYear, Number(month), 0).getDate();
}

export function DateSelect({
  id,
  label,
  maxDate,
  minYear,
  name,
  required = false,
}: {
  id: string;
  label: string;
  maxDate: string;
  minYear: number;
  name: string;
  required?: boolean;
}) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const maxYear = Number(maxDate.slice(0, 4));
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => maxYear - index
  );
  const dayLimit = getDayLimit(year, month);
  const value = year && month && day ? `${year}-${pad(month)}-${pad(day)}` : "";
  const instructionId = `${id}-instruction`;
  const selectClassName =
    "min-h-12 w-full appearance-none rounded-xl border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <p id={instructionId} className="mt-1 text-xs text-muted-foreground">
        Día → mes → año
      </p>
      <input id={id} name={name} type="hidden" value={value} />
      <div className="mt-2 grid grid-cols-[0.8fr_1.35fr_1fr] gap-2">
        <select
          aria-describedby={instructionId}
          aria-label={`Día de ${label.toLowerCase()}`}
          required={required}
          value={day}
          onChange={(event) => setDay(event.target.value)}
          className={selectClassName}
        >
          <option value="">Día</option>
          {Array.from({ length: dayLimit }, (_, index) => index + 1).map(
            (option) => (
              <option key={option} value={String(option).padStart(2, "0")}>
                {option}
              </option>
            )
          )}
        </select>

        <select
          aria-describedby={instructionId}
          aria-label={`Mes de ${label.toLowerCase()}`}
          required={required}
          value={month}
          onChange={(event) => {
            const nextMonth = event.target.value;
            setMonth(nextMonth);
            if (Number(day) > getDayLimit(year, nextMonth)) setDay("");
          }}
          className={selectClassName}
        >
          <option value="">Mes</option>
          {MONTHS.map((option, index) => (
            <option key={option} value={String(index + 1).padStart(2, "0")}>
              {option}
            </option>
          ))}
        </select>

        <select
          aria-describedby={instructionId}
          aria-label={`Año de ${label.toLowerCase()}`}
          required={required}
          value={year}
          onChange={(event) => {
            const nextYear = event.target.value;
            setYear(nextYear);
            if (Number(day) > getDayLimit(nextYear, month)) setDay("");
          }}
          className={selectClassName}
        >
          <option value="">Año</option>
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
