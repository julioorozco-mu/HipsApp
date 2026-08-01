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

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { day: "", month: "", year: "" };
  }

  const [year, month, day] = value.split("-");
  return { day, month, year };
}

function pad(value: string) {
  return value.padStart(2, "0");
}

export function DateSelect({
  defaultValue,
  id,
  label,
  maxDate,
  minYear,
  name,
  required = false,
}: {
  defaultValue?: string;
  id: string;
  label: string;
  maxDate: string;
  minYear: number;
  name: string;
  required?: boolean;
}) {
  const initialDate = parseDate(defaultValue);
  const [year, setYear] = useState(initialDate.year);
  const [month, setMonth] = useState(initialDate.month);
  const [day, setDay] = useState(initialDate.day);
  const [maxYear, maxMonth, maxDay] = maxDate.split("-").map(Number);
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => maxYear - index
  );
  const monthLimit = Number(year) === maxYear ? maxMonth : 12;
  const months = MONTHS.slice(0, monthLimit);
  const daysInSelectedMonth =
    year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const dayLimit =
    Number(year) === maxYear && Number(month) === maxMonth
      ? Math.min(daysInSelectedMonth, maxDay)
      : daysInSelectedMonth;
  const value = year && month && day ? `${year}-${pad(month)}-${pad(day)}` : "";
  const instructionId = `${id}-instruction`;
  const selectClassName =
    "min-h-12 w-full appearance-none rounded-xl border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <p id={instructionId} className="mt-1 text-xs text-muted-foreground">
        Año → mes → día
      </p>
      <input id={id} name={name} type="hidden" value={value} />
      <div className="mt-2 grid grid-cols-[1fr_1.35fr_0.85fr] gap-2">
        <select
          aria-describedby={instructionId}
          aria-label={`Año de ${label.toLowerCase()}`}
          required={required}
          value={year}
          onChange={(event) => {
            setYear(event.target.value);
            setMonth("");
            setDay("");
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

        <select
          aria-describedby={instructionId}
          aria-label={`Mes de ${label.toLowerCase()}`}
          required={required}
          disabled={!year}
          value={month}
          onChange={(event) => {
            setMonth(event.target.value);
            setDay("");
          }}
          className={selectClassName}
        >
          <option value="">Mes</option>
          {months.map((option, index) => (
            <option key={option} value={String(index + 1).padStart(2, "0")}>
              {option}
            </option>
          ))}
        </select>

        <select
          aria-describedby={instructionId}
          aria-label={`Día de ${label.toLowerCase()}`}
          required={required}
          disabled={!year || !month}
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
      </div>
    </fieldset>
  );
}
