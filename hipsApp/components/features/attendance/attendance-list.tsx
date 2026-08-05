"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { saveAttendance } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AttendanceStudent = {
  id: string;
  nombre: string;
};

type AttendanceMode = "open" | "saved" | "disabled";

const avatarStyles = [
  "bg-[oklch(0.66_0.17_155)]",
  "bg-[oklch(0.62_0.23_295)]",
  "bg-[oklch(0.82_0.2_120)] text-[oklch(0.25_0.04_120)]",
] as const;

export function AttendanceList({
  canFinalize,
  initialPresentIds,
  mode,
  sessionId,
  students,
  unavailableMessage,
}: {
  canFinalize: boolean;
  initialPresentIds: string[];
  mode: AttendanceMode;
  sessionId: string | null;
  students: AttendanceStudent[];
  unavailableMessage: string | null;
}) {
  const [query, setQuery] = useState("");
  const [presentIds, setPresentIds] = useState<Set<string>>(
    () => new Set(initialPresentIds)
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const editable = mode === "open";

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;
    return students.filter((student) =>
      student.nombre.toLowerCase().includes(normalizedQuery)
    );
  }, [students, query]);

  function togglePresent(studentId: string) {
    if (!editable) return;
    setPresentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function handleSave() {
    if (!editable || !sessionId) return;
    startTransition(async () => {
      setMessage("");
      try {
        const result = await saveAttendance(sessionId, [...presentIds]);
        if (result.error) {
          setMessage(result.error);
          return;
        }

        // La navegación completa evita errores de transición RSC/PWA después
        // de una Server Action y garantiza datos frescos de la sesión.
        window.location.assign(`/asistencia/finalizar?session=${sessionId}`);
      } catch {
        setMessage(
          "La asistencia pudo haberse guardado, pero no se pudo abrir el cierre. Recarga esta pantalla para verificarla."
        );
      }
    });
  }

  if (!sessionId) {
    return (
      <div className="mt-8 flex flex-1 items-start justify-center">
        <section className="w-full rounded-3xl border border-dashed border-primary/30 bg-primary/[0.035] px-6 py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarPlus className="size-8" />
          </span>
          <h2 className="mt-4 text-xl font-bold">No hay clases programadas para hoy</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Crea una clase y su horario para habilitar el registro de asistencia.
          </p>
          <Link
            href="/clases/nueva"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-5" />
            Crear clase
          </Link>
          {unavailableMessage && unavailableMessage !== "No hay clases programadas para hoy." ? (
            <p className="mt-3 text-xs text-muted-foreground">{unavailableMessage}</p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar alumno"
          aria-label="Buscar alumno"
          className="h-13 rounded-xl border-border bg-card pl-12 text-base shadow-none"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {students.length === 0
            ? "No hay alumnos con una membresía vigente."
            : `No encontramos alumnos con "${query}".`}
        </p>
      ) : (
        <ul className="mt-4 min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain rounded-2xl border border-border">
          {filteredStudents.map((student, index) => {
            const initials = student.nombre
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();
            const selected = presentIds.has(student.id);

            return (
              <li
                key={student.id}
                className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 [content-visibility:auto] [contain-intrinsic-size:5rem]"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-10 place-items-center rounded-full text-xs font-bold text-[oklch(0.99_0.003_300)]",
                    avatarStyles[index % avatarStyles.length]
                  )}
                >
                  {initials}
                </span>
                <span className="truncate text-sm font-semibold">
                  {student.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => togglePresent(student.id)}
                  disabled={!editable}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default",
                    selected
                      ? "border-[oklch(0.72_0.16_145)] bg-[oklch(0.9_0.13_130)] text-[oklch(0.3_0.08_130)]"
                      : editable
                        ? "border-border bg-card hover:bg-secondary active:bg-accent"
                        : "border-border bg-secondary/40 text-muted-foreground"
                  )}
                >
                  {selected ? <Check className="size-4" /> : null}
                  Presente
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="shrink-0 pt-4">
        {message ? (
          <p role="status" className="mb-2 text-center text-sm font-medium text-destructive">
            {message}
          </p>
        ) : null}

        {mode === "saved" ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-[oklch(0.94_0.07_145)] px-4 py-3 text-[oklch(0.34_0.09_145)]">
              <CheckCircle2 className="size-6 shrink-0" />
              <div>
                <p className="font-semibold">Asistencia guardada</p>
                <p className="text-xs opacity-80">
                  {presentIds.size} {presentIds.size === 1 ? "alumno presente" : "alumnos presentes"}.
                </p>
              </div>
            </div>
            {canFinalize ? (
              <a
                href={`/asistencia/finalizar?session=${sessionId}`}
                className="flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Continuar a Finalizar clase
              </a>
            ) : (
              <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-center text-sm font-medium text-muted-foreground">
                <Clock3 className="size-5 shrink-0" />
                {unavailableMessage ?? "La clase todavía no puede finalizarse."}
              </div>
            )}
          </div>
        ) : mode === "disabled" ? (
          <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-center text-sm font-medium text-muted-foreground">
            <Clock3 className="size-5 shrink-0" />
            {unavailableMessage ?? "La asistencia no está disponible para esta clase."}
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || students.length === 0 || presentIds.size === 0}
            className="h-14 w-full rounded-xl bg-[oklch(0.52_0.23_293)] text-base font-semibold text-primary-foreground hover:bg-[oklch(0.47_0.21_293)]"
          >
            {isPending
              ? "Guardando..."
              : `Guardar asistencia${presentIds.size ? ` (${presentIds.size})` : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}
