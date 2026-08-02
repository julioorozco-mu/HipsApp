"use client";

import { useMemo, useState } from "react";
import { Flame, Search } from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui/input";

export type StudentListItem = {
  id: string;
  nombre: string;
  currentStreak: number;
  membershipStatus: string;
};

const filters = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "vencidos", label: "Vencidos" },
] as const;

type Filter = (typeof filters)[number]["value"];

const membershipLabel: Record<string, string> = {
  activa: "Activa",
  por_vencer: "Por vencer",
  vencida: "Vencida",
  sin_registro: "Sin membresía",
};

const membershipDot: Record<string, string> = {
  activa: "bg-[oklch(0.66_0.2_145)]",
  por_vencer: "bg-[oklch(0.8_0.2_115)]",
  vencida: "bg-[oklch(0.65_0.25_340)]",
  sin_registro: "bg-muted-foreground",
};

const avatarColors = [
  "bg-[oklch(0.64_0.18_150)]",
  "bg-[oklch(0.6_0.22_293)]",
  "bg-[oklch(0.78_0.2_120)]",
  "bg-[oklch(0.62_0.22_340)]",
];

export function StudentList({ students }: { students: StudentListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
    return students.filter((student) => {
      const matchesQuery = student.nombre.toLocaleLowerCase("es-MX").includes(normalizedQuery);
      const matchesFilter =
        filter === "todos" ||
        (filter === "activos" &&
          ["activa", "por_vencer"].includes(student.membershipStatus)) ||
        (filter === "vencidos" &&
          ["vencida", "sin_registro"].includes(student.membershipStatus));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, students]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-4 shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar alumno"
          placeholder="Buscar alumno"
          className="h-12 rounded-xl pl-11 text-base"
        />
      </div>

      <div className="mt-3 flex shrink-0 gap-2" aria-label="Filtrar alumnos">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              filter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary/60 hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-[calc(100dvh-21rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-card sm:max-h-[calc(100dvh-24rem)]">
        {visibleStudents.length ? (
          <ul className="divide-y">
            {visibleStudents.map((student, index) => (
              <li key={student.id}>
                <Link
                  href={`/alumnos/${student.id}`}
                  className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:bg-accent"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-11 place-items-center rounded-full text-sm font-bold text-white ${avatarColors[index % avatarColors.length]}`}
                  >
                    {student.nombre
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{student.nombre}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`size-2 rounded-full ${membershipDot[student.membershipStatus] ?? membershipDot.sin_registro}`}
                      />
                      {membershipLabel[student.membershipStatus] ?? membershipLabel.sin_registro}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="flex items-center justify-end gap-1 text-lg font-bold">
                      <Flame className="size-5 text-primary" fill="currentColor" />
                      {student.currentStreak}
                    </span>
                    <span className="block text-[0.65rem] text-muted-foreground">racha</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {students.length ? "No hay alumnos que coincidan." : "Aún no hay alumnos registrados."}
          </p>
        )}
      </div>
    </div>
  );
}
