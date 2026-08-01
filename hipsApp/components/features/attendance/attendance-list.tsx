"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  saveAttendance,
  type AttendanceStatus,
} from "@/app/actions/attendance";
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
  const [selections, setSelections] = useState<
    Record<string, AttendanceStatus>
  >({});
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

  function handleSave() {
    startTransition(async () => {
      setMessage("");
      const result = await saveAttendance(
        sessionId ?? "",
        students.map((student) => ({
          studentId: student.id,
          status: selections[student.id],
        }))
      );
      if (result.error) {
        setMessage(result.error);
        return;
      }
      router.push(`/asistencia/finalizar?session=${sessionId}`);
    });
  }

  return (
    <div className="mt-5 flex flex-1 flex-col">
      <div className="relative">
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
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {filteredStudents.map((student, index) => {
            const initials = student.nombre
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();
            const selected = selections[student.id];

            return (
              <li
                key={student.id}
                className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3"
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
                <span className="truncate text-xs font-semibold">
                  {student.nombre}
                </span>
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelections((current) => ({
                        ...current,
                        [student.id]: "presente",
                      }))
                    }
                    aria-pressed={selected === "presente"}
                    className={cn(
                      "min-h-11 rounded-xl border px-2.5 text-[0.7rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      selected === "presente"
                        ? "border-[oklch(0.82_0.13_130)] bg-[oklch(0.9_0.13_130)] text-[oklch(0.3_0.08_130)]"
                        : "border-border bg-card hover:bg-secondary active:bg-accent"
                    )}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelections((current) => ({
                        ...current,
                        [student.id]: "ausente",
                      }))
                    }
                    aria-pressed={selected === "ausente"}
                    className={cn(
                      "min-h-11 rounded-xl border px-2.5 text-[0.7rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      selected === "ausente"
                        ? "border-[oklch(0.75_0.17_340)] bg-[oklch(0.59_0.24_340)] text-[oklch(0.99_0.005_340)]"
                        : "border-border bg-card hover:bg-secondary active:bg-accent"
                    )}
                  >
                    Ausente
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto pt-4">
        {message ? (
          <p
            role="status"
            className={cn(
              "mb-2 text-center text-sm font-medium",
              "text-destructive"
            )}
          >
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
            Object.keys(selections).length !== students.length
          }
          className="h-14 w-full rounded-xl bg-[oklch(0.52_0.23_293)] text-base font-semibold text-primary-foreground hover:bg-[oklch(0.47_0.21_293)]"
        >
          {isPending ? "Guardando..." : "Guardar asistencia"}
        </Button>
      </div>
    </div>
  );
}
