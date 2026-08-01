import { UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import {
  StudentList,
  type StudentListItem,
} from "@/components/features/students/student-list";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const { data, error } = await supabase
    .from("student_overview")
    .select("id, nombre, current_streak, membership_status")
    .order("nombre");

  if (error) throw new Error(`No se pudieron cargar los alumnos: ${error.message}`);

  const students: StudentListItem[] = data.flatMap((student) =>
    student.id && student.nombre
      ? [{
          id: student.id,
          nombre: student.nombre,
          currentStreak: student.current_streak ?? 0,
          membershipStatus: student.membership_status ?? "sin_registro",
        }]
      : []
  );

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-6 pb-3 sm:px-7 sm:pt-10">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
              Alumnos
            </h1>
            <Link
              href="/alumnos/nuevo"
              aria-label="Registrar alumno"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <UserRoundPlus className="size-7" aria-hidden="true" />
            </Link>
          </header>
          <StudentList students={students} />
        </div>
        <AppNav active="/alumnos" />
      </div>
    </main>
  );
}
