"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { markAttendance } from "@/app/actions/attendance";
import { StudentCard } from "@/components/features/attendance/student-card";
import { Input } from "@/components/ui/input";

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

type OptimisticStudent = AttendanceStudent & { marked: boolean };

export function AttendanceList({ students }: { students: AttendanceStudent[] }) {
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const [optimisticStudents, markOptimistic] = useOptimistic<
    OptimisticStudent[],
    string
  >(
    students.map((student) => ({ ...student, marked: false })),
    (state, studentId) =>
      state.map((student) =>
        student.id === studentId
          ? {
              ...student,
              marked: true,
              current_streak: student.current_streak + 1,
              highest_streak: Math.max(
                student.highest_streak,
                student.current_streak + 1
              ),
            }
          : student
      )
  );

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return optimisticStudents;
    return optimisticStudents.filter((student) =>
      student.nombre.toLowerCase().includes(normalizedQuery)
    );
  }, [optimisticStudents, query]);

  function handleMark(studentId: string) {
    startTransition(async () => {
      markOptimistic(studentId);
      await markAttendance(studentId);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar alumno por nombre..."
            className="h-12 rounded-full pl-9 text-base shadow-sm"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          No encontramos alumnos con &quot;{query}&quot;.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredStudents.map((student) => (
            <li key={student.id}>
              <StudentCard
                student={student}
                marked={student.marked}
                onMark={() => handleMark(student.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
