import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  attendance_saved_at: string | null;
  class_id: string;
  closure_mode: string | null;
  closure_reason: string | null;
  finished_at: string | null;
  finished_by: string | null;
  id: string;
  notes: string | null;
  playlist_url: string | null;
  starts_at: string;
  status: string;
};

type ClassRow = {
  capacity: number | null;
  duration_minutes: number;
  name: string;
};

type StudentRow = {
  id: string;
  nombre: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

const mexicoDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Mexico_City",
  year: "numeric",
});

function sessionDate(value: string) {
  const parts = mexicoDateFormatter.formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function closureLabel(session: SessionRow) {
  if (session.closure_mode === "manual") return "Cerrada manualmente";
  if (session.closure_mode === "automatic" && !session.attendance_saved_at) {
    return "Cerrada sin asistencia";
  }
  if (session.closure_mode === "automatic") return "Finalizada automáticamente";
  if (session.status === "completada") return "Finalizada";
  return "Sesión registrada";
}

export default async function ClassSessionHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, sessionResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("class_sessions").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  if (!sessionResult.data) notFound();

  const session = sessionResult.data as unknown as SessionRow;
  const [classResult, attendanceResult, closerResult] = await Promise.all([
    supabase
      .from("classes")
      .select("name, duration_minutes, capacity")
      .eq("id", session.class_id)
      .maybeSingle(),
    supabase
      .from("attendance")
      .select("student_id, marked_at, status")
      .eq("session_id", session.id)
      .eq("status", "presente")
      .order("marked_at"),
    session.finished_by
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.finished_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (classResult.error || attendanceResult.error || closerResult.error) {
    throw new Error(
      `No se pudo cargar el histórico de la clase: ${
        classResult.error?.message ??
        attendanceResult.error?.message ??
        closerResult.error?.message
      }`
    );
  }

  const classInfo = classResult.data as ClassRow | null;
  const attendance = attendanceResult.data ?? [];
  const studentIds = attendance.map((row) => row.student_id);
  const studentsResult = studentIds.length
    ? await supabase
        .from("students")
        .select("id, nombre")
        .in("id", studentIds)
    : { data: [], error: null };

  if (studentsResult.error) {
    throw new Error(`No se pudieron cargar los asistentes: ${studentsResult.error.message}`);
  }

  const studentById = new Map(
    ((studentsResult.data ?? []) as StudentRow[]).map((student) => [student.id, student])
  );
  const attendees = attendance.flatMap((row) => {
    const student = studentById.get(row.student_id);
    return student
      ? [{ id: student.id, markedAt: row.marked_at, name: student.nombre }]
      : [];
  });
  const startsAt = new Date(session.starts_at);
  const finishedAt = session.finished_at ? new Date(session.finished_at) : null;
  const statusLabel = closureLabel(session);

  return (
    <MoreShell
      title="Detalle de clase"
      backHref={`/clases?fecha=${sessionDate(session.starts_at)}`}
    >
      <div className="grid gap-5 pb-6">
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[oklch(0.93_0.07_145)] text-[oklch(0.38_0.12_145)]">
              <CheckCircle2 className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-[-0.035em]">
                {classInfo?.name ?? "Clase"}
              </h2>
              <span className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-secondary/45 p-4 text-sm">
            <p className="flex items-center gap-3">
              <CalendarDays className="size-5 text-primary" />
              <span>{capitalize(dateFormatter.format(startsAt))}</span>
            </p>
            <p className="flex items-center gap-3">
              <Clock3 className="size-5 text-primary" />
              <span>
                {timeFormatter.format(startsAt)} · {classInfo?.duration_minutes ?? 60} min
              </span>
            </p>
            <p className="flex items-center gap-3">
              <UsersRound className="size-5 text-primary" />
              <span>
                {attendees.length} {attendees.length === 1 ? "asistente" : "asistentes"}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <h2 className="font-bold">Cierre de la sesión</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="mt-1 font-semibold">{statusLabel}</dd>
            </div>
            {finishedAt ? (
              <div>
                <dt className="text-muted-foreground">Cerrada a las</dt>
                <dd className="mt-1 font-semibold">{timeFormatter.format(finishedAt)}</dd>
              </div>
            ) : null}
            {closerResult.data?.full_name ? (
              <div>
                <dt className="text-muted-foreground">Cerrada por</dt>
                <dd className="mt-1 font-semibold">{closerResult.data.full_name}</dd>
              </div>
            ) : null}
            {session.closure_reason ? (
              <div>
                <dt className="text-muted-foreground">Motivo</dt>
                <dd className="mt-1 flex gap-2 leading-6">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{session.closure_reason}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Asistencia registrada</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {attendees.length}
            </span>
          </div>

          {attendees.length ? (
            <ul className="mt-4 divide-y overflow-hidden rounded-2xl border">
              {attendees.map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-4 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[oklch(0.93_0.07_145)] text-[oklch(0.38_0.12_145)]">
                    <UserRoundCheck className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{student.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {student.markedAt ? timeFormatter.format(new Date(student.markedAt)) : "Presente"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Esta sesión se cerró sin alumnos presentes registrados.
            </p>
          )}
        </section>

        {session.playlist_url ? (
          <a
            href={session.playlist_url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary px-4 font-semibold text-primary"
          >
            <Link2 className="size-5" />
            Abrir playlist de la clase
          </a>
        ) : null}
      </div>
    </MoreShell>
  );
}
