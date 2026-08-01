import {
  MoreHorizontal,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import {
  AttendanceList,
  type AttendanceStudent,
} from "@/components/features/attendance/attendance-list";
import { createClient } from "@/lib/supabase/server";

const classTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const results = user
    ? await Promise.all([
      supabase
        .from("student_overview")
        .select(
          "id, nombre, telefono, objetivo_peso_grasa, current_streak, highest_streak"
        )
        .eq("active", true)
        .in("membership_status", ["activa", "por_vencer"])
        .order("nombre"),
      supabase
        .from("session_overview")
        .select("id, class_name, starts_at")
        .in("status", ["programada", "en_curso"])
        .order("starts_at")
        .limit(1)
        .maybeSingle(),
      ])
    : null;
  const data = results?.[0].data ?? [];
  const session = results?.[1].data ?? null;
  const error = results?.[0].error;
  const sessionError = results?.[1].error;

  if (error || sessionError) {
    throw new Error(
      `No se pudo cargar la asistencia: ${error?.message ?? sessionError?.message}`
    );
  }

  const students: AttendanceStudent[] = data.flatMap((student) =>
    student.id && student.nombre && student.telefono
      ? [
          {
            id: student.id,
            nombre: student.nombre,
            telefono: student.telefono,
            objetivo_peso_grasa: student.objetivo_peso_grasa,
            current_streak: student.current_streak ?? 0,
            highest_streak: student.highest_streak ?? 0,
            membership: null,
          },
        ]
      : []
  );
  const classTime = session?.starts_at
    ? classTimeFormatter.format(new Date(session.starts_at))
    : null;

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-6 pb-5 sm:px-7 sm:pt-10">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
                Asistencia de hoy
              </h1>
              <p className="mt-2 w-fit rounded-full bg-[oklch(0.94_0.07_340)] px-4 py-1.5 text-sm font-semibold text-[oklch(0.48_0.2_340)]">
                {session?.class_name && classTime
                  ? `${session.class_name} · ${classTime}`
                  : "Sin clase programada"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <MoreHorizontal className="size-7" strokeWidth={2.5} />
            </button>
          </header>

          {user ? (
            <AttendanceList sessionId={session?.id ?? null} students={students} />
          ) : (
            <p className="mt-10 rounded-2xl bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
              Inicia sesión para consultar la clase y tomar asistencia.
            </p>
          )}
        </div>

        <AppNav active="/asistencia" />
      </div>
    </main>
  );
}
