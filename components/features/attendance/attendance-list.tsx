"use client";

import { useOptimistic, useTransition } from "react";

import { markAttendance } from "@/app/actions/attendance";
import { StudentCard } from "@/components/features/attendance/student-card";

export type AttendanceStudent = {
  id: string;
  nombre: string;
  current_streak: number;
  highest_streak: number;
  membership: {
    fecha_vencimiento: string;
    estado: "activa" | "por_vencer" | "vencida";
  } | null;
};

type OptimisticStudent = AttendanceStudent & { marked: boolean };

export function AttendanceList({ students }: { students: AttendanceStudent[] }) {
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

  function handleMark(studentId: string) {
    startTransition(async () => {
      markOptimistic(studentId);
      await markAttendance(studentId);
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {optimisticStudents.map((student) => (
        <li key={student.id}>
          <StudentCard
            student={student}
            marked={student.marked}
            onMark={() => handleMark(student.id)}
          />
        </li>
      ))}
    </ul>
  );
}
