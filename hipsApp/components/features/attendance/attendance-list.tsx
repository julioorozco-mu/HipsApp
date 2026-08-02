"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveAttendance } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AttendanceStudent = {
  id: string;
  nombre: string;
  telefono: string;
  objetivo_peso_grasa: number | null;
  current_streak: number;
  highest_streak: number;
  membership: {
    fecha_vencimiento: string;
    estado: "activa" | "por_vencer" | "vencida";
    created_at: string;
  } | null;
};

const avatarStyles = [
  "bg-[oklch(0.66_0.17_155)]",
  "bg-[oklch(0.62_0.23_295)]",
  "bg-[oklch(0.82_0.2_120)] text-[oklch(0.25_0.04_120)]",
] as const;

export function AttendanceList({
  sessionId,
  students,
}: {
  sessionId: string | null;
  students: AttendanceStudent[];
}) {
  const [query, setQuery] = useState("");
  const [presentIds, setPresentIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;
    return students.filter((student) =>
      student.nombre.toLowerCase().includes(normalizedQuery)
    );
  }, [students, query]);

  function togglePresent(studentId: string) {
    setPresentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      setMessage("");
      const result = await saveAttendance(sessionId ?? "", [...presentIds]);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      router.push(`/asistencia/finalizar?session=${sessionId}`);
    });
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
                className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3"
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
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    selected
                      ? "border-[oklch(0.72_0.16_145)] bg-[oklch(0.9_0.13_130)] text-[oklch(0.3_0.08_130)]"
                      : "border-border bg-card hover:bg-secondary active:bg-accent"
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
        <Button
          type="button"
          onClick={handleSave}
          disabled={
            isPending ||
            !sessionId ||
            students.length === 0 ||
            presentIds.size === 0
          }
          className="h-14 w-full rounded-xl bg-[oklch(0.52_0.23_293)] text-base font-semibold text-primary-foreground hover:bg-[oklch(0.47_0.21_293)]"
        >
          {isPending
            ? "Guardando..."
            : `Guardar asistencia${presentIds.size ? ` (${presentIds.size})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
