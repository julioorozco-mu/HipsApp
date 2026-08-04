import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { AddStudentLink } from "@/components/features/students/add-student-link";
import {
  StudentList,
  type StudentListItem,
} from "@/components/features/students/student-list";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = normalizeRole(profile?.role);
  if (role === "superadmin") redirect("/usuarios");
  if (role === "alumno") redirect(`/alumnos/${user.id}`);

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
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-6 pb-4 sm:px-7 sm:pt-10">
          <header className="shrink-0">
            <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
              Alumnos
            </h1>
          </header>
          <StudentList students={students} />
        </div>
        <AddStudentLink />
        <AppNav />
      </div>
    </main>
  );
}
