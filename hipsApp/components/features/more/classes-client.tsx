"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PlayCircle,
  Trash2,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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

export type ClassSessionItem = {
  activeTemplate: boolean;
  attendanceSaved: boolean;
  capacity: number;
  classId: string;
  closureMode: string | null;
  closureReason: string | null;
  durationMinutes: number;
  finishedAt: string | null;
  id: string;
  name: string;
  presentCount: number;
  startsAt: string;
  status: string;
};

type CalendarDay = {
  date: Date;
  dayNumber: number;
  iso: string;
  label: string;
  weekday: number;
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const sessionTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

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

const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

function monthLabel(days: CalendarDay[]) {
  const first = days[0].date;
  const last = days.at(-1)?.date ?? first;

  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    return capitalize(monthFormatter.format(first));
  }

  const firstLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: first.getFullYear() === last.getFullYear() ? undefined : "numeric",
  }).format(first);
  return `${capitalize(firstLabel)} – ${capitalize(monthFormatter.format(last))}`;
}

function timeLabel(value: string, durationMinutes: number = 0) {
  const [hourValue, minute] = value.slice(0, 5).split(":").map(Number);
  const startSuffix = hourValue >= 12 ? "p. m." : "a. m.";
  const startFormatted = `${hourValue % 12 || 12}:${String(minute).padStart(2, "0")} ${startSuffix}`;

  if (!durationMinutes) return startFormatted;

  const endTotalMinutes = hourValue * 60 + minute + durationMinutes;
  const endHourValue = Math.floor(endTotalMinutes / 60) % 24;
  const endMinute = endTotalMinutes % 60;
  const endSuffix = endHourValue >= 12 ? "p. m." : "a. m.";
  const endFormatted = `${endHourValue % 12 || 12}:${String(endMinute).padStart(2, "0")} ${endSuffix}`;

  return `${startFormatted} – ${endFormatted}`;
}

function formatSessionTime(startsAt: string, durationMinutes: number) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return `${sessionTimeFormatter.format(start)} – ${sessionTimeFormatter.format(end)}`;
}

function sessionStatus(item: ClassSessionItem) {
  if (item.status === "completada") {
    if (item.closureMode === "manual") {
      return {
        label: "Cerrada",
        tone: "bg-[oklch(0.95_0.07_80)] text-[oklch(0.43_0.13_65)]",
      };
    }
    if (item.closureMode === "automatic" && !item.attendanceSaved) {
      return {
        label: "Cerrada",
        tone: "bg-secondary text-muted-foreground",
      };
    }
    if (item.closureMode === "automatic") {
      return {
        label: "Finalizada",
        tone: "bg-[oklch(0.93_0.07_145)] text-[oklch(0.38_0.12_145)]",
      };
    }
    return {
      label: "Finalizada",
      tone: "bg-[oklch(0.93_0.07_145)] text-[oklch(0.38_0.12_145)]",
    };
  }

  if (item.status === "en_curso" || item.attendanceSaved) {
    return {
      label: "En curso",
      tone: "bg-[oklch(0.93_0.07_145)] text-[oklch(0.38_0.12_145)]",
    };
  }

  return {
    label: "Programada",
    tone: "bg-primary/10 text-primary",
  };
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
              <div className="flex items-start justify-between gap-3">
                <h2 className="truncate font-bold">{item.name}</h2>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                  Programada
                </span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                {timeLabel(item.startTime, item.durationMinutes)}
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
              fechas futuras. Las sesiones ya realizadas permanecerán en el historial.
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

function SessionClassCard({ item }: { item: ClassSessionItem }) {
  const router = useRouter();
  const completed = item.status === "completada";
  const status = sessionStatus(item);
  const Icon = completed ? CheckCircle2 : PlayCircle;

  function openSession() {
    router.push(
      completed
        ? `/clases/sesiones/${item.id}`
        : `/asistencia?session=${item.id}`
    );
  }

  return (
    <button
      type="button"
      onClick={openSession}
      className="w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="truncate font-bold">{item.name}</h2>
            <span className={`max-w-36 shrink-0 rounded-full px-2 py-1 text-right text-[0.68rem] font-semibold leading-tight ${status.tone}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" />
            {formatSessionTime(item.startsAt, item.durationMinutes)}
          </p>
          {completed ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <UsersRound className="size-4 text-primary" />
              {item.presentCount} {item.presentCount === 1 ? "asistente" : "asistentes"}
            </p>
          ) : (
            <p className="mt-2 text-sm">Cupo máximo: {item.capacity}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {completed
              ? "Toca para consultar el cierre y la asistencia histórica."
              : "Toca para abrir la asistencia de esta sesión."}
          </p>
        </div>
      </div>
    </button>
  );
}

export function ClassesClient({
  classes,
  selectedDate,
  sessions,
  today,
}: {
  classes: ClassItem[];
  selectedDate: string;
  sessions: ClassSessionItem[];
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic date state for 0ms instant UI feedback upon click
  const [activeDate, setActiveDate] = useState(selectedDate);

  useEffect(() => {
    setActiveDate(selectedDate);
  }, [selectedDate]);

  const selected = useMemo(() => parseLocalDate(activeDate), [activeDate]);
  const [windowStart, setWindowStart] = useState(selected);
  const days = useMemo(() => calendarDays(windowStart), [windowStart]);
  const visibleTemplates =
    sessions.length === 0 && activeDate >= today
      ? classes.filter((item) => item.weekday === selected.getDay())
      : [];
  const isPast = activeDate < today;
  const isToday = activeDate === today;

  const lastProcessedDate = useRef(activeDate);

  useEffect(() => {
    if (activeDate !== lastProcessedDate.current) {
      lastProcessedDate.current = activeDate;
      const first = windowStart.getTime();
      const last = addDays(windowStart, 4).getTime();
      const value = selected.getTime();
      if (value < first || value > last) setWindowStart(selected);
    }
  }, [activeDate, selected, windowStart]);

  function prefetchIso(iso: string) {
    router.prefetch(`/clases?fecha=${iso}`);
  }

  function chooseDate(date: Date) {
    const iso = dateKey(date);
    setActiveDate(iso);
    startTransition(() => {
      router.replace(`/clases?fecha=${iso}`, { scroll: false });
    });
  }

  function navigate(amount: number) {
    const next = addDays(windowStart, amount);
    setWindowStart(next);
    chooseDate(next);
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
              onMouseEnter={() => prefetchIso(dateKey(addDays(windowStart, -5)))}
              onTouchStart={() => prefetchIso(dateKey(addDays(windowStart, -5)))}
              className="grid size-10 place-items-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Cinco días siguientes"
              onClick={() => navigate(5)}
              onMouseEnter={() => prefetchIso(dateKey(addDays(windowStart, 5)))}
              onTouchStart={() => prefetchIso(dateKey(addDays(windowStart, 5)))}
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
            onMouseEnter={() => prefetchIso(dateKey(addDays(windowStart, -5)))}
            onTouchStart={() => prefetchIso(dateKey(addDays(windowStart, -5)))}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronLeft className="size-6" />
          </button>

          {days.map((day) => {
            const selectedDay = day.iso === activeDate;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => chooseDate(day.date)}
                onMouseEnter={() => prefetchIso(day.iso)}
                onTouchStart={() => prefetchIso(day.iso)}
                aria-pressed={selectedDay}
                className={`grid min-h-24 place-items-center rounded-2xl px-1 transition-colors ${
                  selectedDay
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
            onMouseEnter={() => prefetchIso(dateKey(addDays(windowStart, 5)))}
            onTouchStart={() => prefetchIso(dateKey(addDays(windowStart, 5)))}
            className="grid size-11 place-items-center rounded-full border-2 text-muted-foreground"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </section>

      <section className={`grid gap-3 transition-opacity duration-150 ${isPending ? "opacity-50" : "opacity-100"}`}>
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="font-semibold">
              {isPast ? "Historial del día" : isToday ? "Clases de hoy" : "Programación"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isPast
                ? "Las sesiones cerradas se conservan como registro histórico."
                : isToday
                  ? "El estado refleja la sesión real de hoy."
                  : "Los cambios aquí modifican la programación recurrente."}
            </p>
          </div>
          {isPast && sessions.length ? (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
            </span>
          ) : null}
        </div>

        {sessions.map((item) => (
          <SessionClassCard key={item.id} item={item} />
        ))}
        {visibleTemplates.map((item) => (
          <SwipeClassCard key={item.id} item={item} />
        ))}
        {!sessions.length && !visibleTemplates.length ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {isPast
              ? "No hay una sesión registrada para este día."
              : "No hay clases registradas para este día."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
