"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteClass } from "@/app/actions/more";

export type ClassItem = {
  capacity: number;
  durationMinutes: number;
  id: string;
  name: string;
  startTime: string;
  weekday: number;
};

type CalendarDay = {
  date: Date;
  dayNumber: number;
  iso: string;
  label: string;
  weekday: number;
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function calendarDays(start: Date): CalendarDay[] {
  return Array.from({ length: 5 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      dayNumber: date.getDate(),
      iso: dateKey(date),
      label: weekdayLabels[date.getDay()],
      weekday: date.getDay(),
    };
  });
}

function monthLabel(days: CalendarDay[]) {
  const first = days[0].date;
  const last = days.at(-1)?.date ?? first;
  const month = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  });

  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    return capitalize(month.format(first));
  }

  const firstLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: first.getFullYear() === last.getFullYear() ? undefined : "numeric",
  }).format(first);
  return `${capitalize(firstLabel)} – ${capitalize(month.format(last))}`;
}

function timeLabel(value: string) {
  const [hourValue, minute] = value.slice(0, 5).split(":").map(Number);
  const suffix = hourValue >= 12 ? "p. m." : "a. m.";
  return `${hourValue % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 flex-1 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar clase"}
    </button>
  );
}

function SwipeClassCard({ item }: { item: ClassItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const deleteAction = deleteClass.bind(null, item.id);

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  function openEditor() {
    router.push(`/clases/${item.id}/editar`);
  }

  return (
    <>
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border bg-destructive"
      >
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="absolute inset-y-0 right-0 z-10 flex w-24 flex-col items-center justify-center gap-1 bg-destructive text-xs font-semibold text-destructive-foreground"
        >
          <Trash2 className="size-5" /> Eliminar
        </button>

        <article
          role="link"
          tabIndex={0}
          aria-label={`Editar ${item.name}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (open) setOpen(false);
              else openEditor();
            }
          }}
          onBlur={(event) => {
            if (!cardRef.current?.contains(event.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
          onPointerDown={(event) => {
            pointerStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerCancel={() => {
            pointerStart.current = null;
          }}
          onPointerUp={(event) => {
            if (!pointerStart.current) return;
            const distanceX = event.clientX - pointerStart.current.x;
            const distanceY = event.clientY - pointerStart.current.y;
            pointerStart.current = null;

            if (Math.abs(distanceY) > Math.abs(distanceX)) return;
            if (distanceX < -35) {
              setOpen(true);
              return;
            }
            if (distanceX > 25 || open) {
              setOpen(false);
              return;
            }
            if (Math.abs(distanceX) < 8) openEditor();
          }}
          style={{ transform: open ? "translateX(-6rem)" : "translateX(0)" }}
          className="relative z-20 cursor-pointer bg-card p-4 transition-transform duration-200 touch-pan-y focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
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
              <p className="mt-2 text-xs text-muted-foreground">
                Toca para editar · Desliza a la izquierda para eliminar.
              </p>
            </div>
          </div>
        </article>
      </div>

      {confirming ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-black/45 p-3 sm:place-items-center"
          role="presentation"
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) {
              setConfirming(false);
              setOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${item.id}`}
            className="w-full max-w-sm rounded-[1.75rem] bg-card p-5 shadow-2xl"
          >
            <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </span>
            <h2 id={`delete-title-${item.id}`} className="mt-4 text-xl font-bold">
              ¿Eliminar esta clase?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <strong className="text-foreground">{item.name}</strong> dejará de aparecer en
              el calendario y ya no generará sesiones de asistencia. El registro se conservará
              como inactivo.
            </p>
            <form action={deleteAction} className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setOpen(false);
                }}
                className="min-h-12 flex-1 rounded-xl border px-4 font-semibold"
              >
                Cancelar
              </button>
              <DeleteSubmitButton />
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function ClassesClient({
  classes,
  today,
}: {
  classes: ClassItem[];
  today: string;
}) {
  const initialDate = useMemo(() => parseLocalDate(today), [today]);
  const [windowStart, setWindowStart] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const days = useMemo(() => calendarDays(windowStart), [windowStart]);
  const selectedKey = dateKey(selectedDate);
  const visibleClasses = classes.filter(
    (item) => item.weekday === selectedDate.getDay()
  );

  function navigate(amount: number) {
    const next = addDays(windowStart, amount);
    setWindowStart(next);
    setSelectedDate(next);
  }

  return (
    <div className="grid gap-5 pb-20">
      <section
        aria-label="Calendario semanal"
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold sm:text-xl">{monthLabel(days)}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Cinco días anteriores"
              onClick={() => navigate(-5)}
              className="grid size-10 place-items-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Cinco días siguientes"
              onClick={() => navigate(5)}
              className="grid size-10 place-items-center rounded-full hover:bg-secondary"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[2.75rem_repeat(5,minmax(0,1fr))_2.75rem] items-center gap-2">
          <button
            type="button"
            aria-label="Cinco días anteriores"
            onClick={() => navigate(-5)}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronLeft className="size-6" />
          </button>

          {days.map((day) => {
            const selected = day.iso === selectedKey;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-pressed={selected}
                className={`grid min-h-24 place-items-center rounded-2xl px-1 transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-primary/8 hover:bg-primary/15"
                }`}
              >
                <span className="text-sm sm:text-base">{day.label}</span>
                <strong className="text-2xl font-medium sm:text-3xl">
                  {day.dayNumber}
                </strong>
              </button>
            );
          })}

          <button
            type="button"
            aria-label="Cinco días siguientes"
            onClick={() => navigate(5)}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </section>

      <section className="grid gap-3">
        {visibleClasses.map((item) => (
          <SwipeClassCard key={item.id} item={item} />
        ))}
        {!visibleClasses.length ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No hay clases registradas para este día.
          </p>
        ) : null}
      </section>
    </div>
  );
}
