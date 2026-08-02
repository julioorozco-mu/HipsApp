"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { deleteClass } from "@/app/actions/more";

export type ClassItem = {
  capacity: number;
  durationMinutes: number;
  id: string;
  name: string;
  startTime: string;
  weekday: number;
};

const week = [
  { date: 3, label: "Dom", weekday: 0 },
  { date: 4, label: "Lun", weekday: 1 },
  { date: 5, label: "Mar", weekday: 2 },
  { date: 6, label: "Mié", weekday: 3 },
  { date: 7, label: "Jue", weekday: 4 },
];

function timeLabel(value: string) {
  const [hourValue, minute] = value.slice(0, 5).split(":").map(Number);
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  return `${hourValue % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function SwipeClassCard({ item }: { item: ClassItem }) {
  const [open, setOpen] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const deleteAction = deleteClass.bind(null, item.id);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-secondary">
      <div className="absolute inset-y-0 right-0 grid w-36 grid-cols-2">
        <Link
          href={`/clases/${item.id}/editar`}
          className="flex flex-col items-center justify-center gap-1 bg-primary text-xs font-semibold text-primary-foreground"
        >
          <Pencil className="size-5" /> Editar
        </Link>
        <form action={deleteAction} className="contents">
          <button
            type="submit"
            onClick={(event) => {
              if (!window.confirm(`¿Eliminar ${item.name}?`)) event.preventDefault();
            }}
            className="flex flex-col items-center justify-center gap-1 bg-destructive text-xs font-semibold text-destructive-foreground"
          >
            <Trash2 className="size-5" /> Eliminar
          </button>
        </form>
      </div>

      <article
        onPointerDown={(event) => {
          pointerStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          if (distance < -35) setOpen(true);
          if (distance > 35) setOpen(false);
          pointerStart.current = null;
        }}
        onClick={() => open && setOpen(false)}
        style={{ transform: open ? "translateX(-9rem)" : "translateX(0)" }}
        className="relative z-10 bg-card p-4 transition-transform duration-200 touch-pan-y"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate font-bold">{item.name}</h2>
              <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                Activa
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" />
              {timeLabel(item.startTime)} · {item.durationMinutes} min
            </p>
            <p className="mt-2 text-sm">Cupo máximo: {item.capacity}</p>
            <p className="mt-2 text-xs text-muted-foreground">Desliza a la izquierda para editar o eliminar.</p>
          </div>
        </div>
      </article>
    </div>
  );
}

export function ClassesClient({ classes }: { classes: ClassItem[] }) {
  const [selectedWeekday, setSelectedWeekday] = useState(0);
  const [offset, setOffset] = useState(0);
  const visibleClasses = classes.filter((item) => item.weekday === selectedWeekday);

  return (
    <div className="grid gap-5">
      <section aria-label="Calendario semanal" className="rounded-3xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Agosto 2026</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={() => setOffset((current) => current - 5)}
              className="grid size-10 place-items-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => setOffset((current) => current + 5)}
              className="grid size-10 place-items-center rounded-full hover:bg-secondary"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[2.75rem_repeat(5,minmax(0,1fr))_2.75rem] items-center gap-2">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setOffset((current) => current - 5)}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronLeft className="size-6" />
          </button>

          {week.map((day) => {
            const selected = day.weekday === selectedWeekday;
            return (
              <button
                key={day.weekday}
                type="button"
                onClick={() => setSelectedWeekday(day.weekday)}
                className={`grid min-h-24 place-items-center rounded-2xl px-1 transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-primary/8 hover:bg-primary/15"
                }`}
              >
                <span className="text-base">{day.label}</span>
                <strong className="text-3xl font-medium">{day.date + offset}</strong>
              </button>
            );
          })}

          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setOffset((current) => current + 5)}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        {visibleClasses.map((item) => <SwipeClassCard key={item.id} item={item} />)}
        {!visibleClasses.length ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No hay clases registradas para este día.
          </p>
        ) : null}
      </section>
    </div>
  );
}
