import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  PlayCircle,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import {
  AttendanceList,
  type AttendanceStudent,
} from "@/components/features/attendance/attendance-list";
import { ClassCloseMenu } from "@/components/features/attendance/class-close-menu";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const classTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

type SessionRow = {
  attendance_saved_at: string | null;
  class_id: string | null;
  class_name: string | null;
  closure_mode: string | null;
  closure_reason: string | null;
  id: string | null;
  present_count: number | null;
  starts_at: string | null;
  status: string | null;
};

type SessionState =
  | "upcoming"
  | "ready"
  | "started"
  | "in_progress"
  | "closing"
  | "missed"
  | "completed";

type AttendanceSession = {
  attendanceSaved: boolean;
  className: string;
  closureMode: string | null;
  closureReason: string | null;
  durationMinutes: number;
  endsAt: Date;
  id: string;
  opensAt: Date;
  presentCount: number;
  startsAt: Date;
  state: SessionState;
  status: string;
};

const mexicoDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Mexico_City",
  year: "numeric",
});

function mexicoDate() {
  const parts = mexicoDateFormatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00-06:00`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stateLabel(session: AttendanceSession) {
  if (session.state === "upcoming") return "Próxima";
  if (session.state === "ready") return "Lista para iniciar";
  if (session.state === "started") return "Inició · asistencia pendiente";
  if (session.state === "in_progress") return "En curso";
  if (session.state === "closing") return "Pendiente de cierre";
  if (session.state === "completed") {
    if (session.closureMode === "manual") return "Cerrada manualmente";
    if (session.closureMode === "automatic" && !session.attendanceSaved) {
      return "Cerrada sin asistencia";
    }
    if (session.closureMode === "automatic") return "Finalizada automáticamente";
    return "Finalizada";
  }
  return "Horario concluido";
}

function sessionState(
  status: string,
  attendanceSaved: boolean,
  startsAt: Date,
  opensAt: Date,
  endsAt: Date,
  now: Date
): SessionState {
  if (status === "completada") return "completed";
  if (attendanceSaved) {
    if (now > endsAt) return "closing";
    return "in_progress";
  }
  if (now < opensAt) return "upcoming";
  if (now < startsAt) return "ready";
  if (now <= endsAt) return "started";
  return "missed";
}

function SessionLink({
  active,
  session,
}: {
  active: boolean;
  session: AttendanceSession;
}) {
  const Icon =
    session.state === "completed"
      ? CheckCircle2
      : session.state === "closing"
        ? AlertTriangle
        : session.state === "in_progress"
          ? PlayCircle
          : session.state === "started"
            ? CircleDot
            : Clock3;

  const inactiveTone =
    session.state === "completed"
      ? session.closureMode === "manual"
        ? "border-[oklch(0.82_0.12_70)] bg-[oklch(0.97_0.05_75)] text-[oklch(0.43_0.13_60)]"
        : "border-[oklch(0.78_0.12_145)] bg-[oklch(0.96_0.05_145)] text-[oklch(0.34_0.1_145)]"
      : session.state === "closing"
        ? "border-[oklch(0.82_0.12_80)] bg-[oklch(0.97_0.05_80)] text-[oklch(0.45_0.13_70)]"
        : session.state === "in_progress"
          ? "border-[oklch(0.77_0.12_150)] bg-[oklch(0.96_0.05_150)]"
          : session.state === "missed"
            ? "bg-secondary/50 text-muted-foreground"
            : "bg-card hover:bg-secondary";

  return (
    <Link
      href={`/asistencia?session=${session.id}`}
      aria-current={active ? "page" : undefined}
      className={`min-w-48 shrink-0 rounded-2xl border px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "border-primary bg-primary text-primary-foreground" : inactiveTone
      }`}
    >
      <span className="block truncate font-semibold">{session.className}</span>
      <span
        className={`mt-1 flex items-center gap-1.5 text-xs ${
          active ? "text-primary-foreground/85" : "text-muted-foreground"
        }`}
      >
        <Icon className="size-3.5" />
        {classTimeFormatter.format(session.startsAt)} · {stateLabel(session)}
      </span>
    </Link>
  );
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string; session?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = mexicoDate();
  const range = dayRange(today);
  const requestedSession = params.session;
  const now = new Date();

  if (user) {
    const { error: ensureError } = await supabase.rpc(
      "ensure_daily_class_sessions" as never,
      { p_date: today } as never
    );
    if (ensureError) {
      throw new Error(`No se pudieron preparar las clases de hoy: ${ensureError.message}`);
    }

    // Respaldo inmediato del cron: si la pantalla se abre justo después del
    // final del horario, el estado ya llega cerrado y consistente.
    await supabase.rpc("close_expired_class_sessions" as never);
  }

  const results = user
    ? await Promise.all([
        supabase
          .from("student_overview")
          .select("id, nombre")
          .eq("active", true)
          .in("membership_status", ["activa", "por_vencer"])
          .order("nombre"),
        supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, starts_at, status, attendance_saved_at, present_count, closure_mode, closure_reason" as never
          )
          .gte("starts_at", range.start)
          .lt("starts_at", range.end)
          .neq("status", "cancelada")
          .order("starts_at"),
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),
      ])
    : null;
  const data = results?.[0].data ?? [];
  const sessionData = (results?.[1].data ?? []) as unknown as SessionRow[];
  const profile = results?.[2].data ?? null;
  const error = results?.[0].error;
  const sessionError = results?.[1].error;

  if (error || sessionError) {
    throw new Error(
      `No se pudo cargar la asistencia: ${error?.message ?? sessionError?.message}`
    );
  }

  const classIds = sessionData.flatMap((session) =>
    session.class_id ? [session.class_id] : []
  );
  const sessionIds = sessionData.flatMap((session) =>
    session.id ? [session.id] : []
  );
  const [
    { data: classRows, error: classError },
    { data: attendanceRows, error: attendanceError },
  ] = user
    ? await Promise.all([
        classIds.length
          ? supabase
              .from("classes")
              .select("id, duration_minutes")
              .in("id", classIds)
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase
              .from("attendance")
              .select("session_id, student_id, status")
              .in("session_id", sessionIds)
              .eq("status", "presente")
          : Promise.resolve({ data: [], error: null }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (classError || attendanceError) {
    throw new Error(
      `No se pudo preparar la asistencia: ${classError?.message ?? attendanceError?.message}`
    );
  }

  const durationByClass = new Map(
    (classRows ?? []).map((item) => [item.id, item.duration_minutes])
  );
  const presentBySession = new Map<string, string[]>();
  for (const row of attendanceRows ?? []) {
    const current = presentBySession.get(row.session_id) ?? [];
    current.push(row.student_id);
    presentBySession.set(row.session_id, current);
  }

  const sessions: AttendanceSession[] = sessionData.flatMap((session) => {
    if (!session.id || !session.class_id || !session.class_name || !session.starts_at) {
      return [];
    }
    const startsAt = new Date(session.starts_at);
    const durationMinutes = durationByClass.get(session.class_id) ?? 60;
    const opensAt = new Date(startsAt.getTime() - 15 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
    const attendanceSaved = Boolean(session.attendance_saved_at);
    const status = session.status ?? "programada";

    return [
      {
        attendanceSaved,
        className: session.class_name,
        closureMode: session.closure_mode,
        closureReason: session.closure_reason,
        durationMinutes,
        endsAt,
        id: session.id,
        opensAt,
        presentCount: Number(session.present_count ?? 0),
        startsAt,
        state: sessionState(status, attendanceSaved, startsAt, opensAt, endsAt, now),
        status,
      },
    ];
  });

  const currentSessions = sessions.filter(
    (item) => item.state !== "completed" && item.state !== "missed"
  );
  const previousSessions = sessions.filter(
    (item) => item.state === "completed" || item.state === "missed"
  );
  const selectedSession =
    sessions.find((item) => item.id === requestedSession) ??
    sessions.find((item) => item.state === "closing") ??
    sessions.find((item) => item.state === "in_progress") ??
    sessions.find((item) => item.state === "started") ??
    sessions.find((item) => item.state === "ready") ??
    sessions.find((item) => item.state === "upcoming") ??
    currentSessions[0] ??
    previousSessions.at(-1) ??
    null;

  const students: AttendanceStudent[] = data.flatMap((student) =>
    student.id && student.nombre
      ? [{ id: student.id, nombre: student.nombre }]
      : []
  );

  const role = normalizeRole(profile?.role);
  const canCloseManually = role === "superadmin" || role === "admin";
  const mode =
    selectedSession?.state === "ready" || selectedSession?.state === "started"
      ? "open"
      : selectedSession?.state === "in_progress" || selectedSession?.state === "closing"
        ? "saved"
        : "disabled";
  const canFinalize = Boolean(
    selectedSession?.attendanceSaved &&
      selectedSession.status !== "completada" &&
      now >= selectedSession.startsAt
  );
  const unavailableMessage = !selectedSession
    ? "No hay clases programadas para hoy."
    : selectedSession.state === "upcoming"
      ? `La asistencia se habilita a las ${classTimeFormatter.format(selectedSession.opensAt)}.`
      : selectedSession.state === "ready"
        ? `La clase inicia a las ${classTimeFormatter.format(selectedSession.startsAt)}.`
        : selectedSession.state === "started"
          ? "La clase ya inició. Guarda la asistencia para marcarla en curso."
          : selectedSession.state === "in_progress"
            ? "La clase está en curso. Puedes finalizarla normalmente o cerrarla desde el menú si ocurre una excepción."
            : selectedSession.state === "closing"
              ? "El horario terminó. La sesión se cerrará automáticamente."
              : selectedSession.state === "completed"
                ? selectedSession.closureReason ?? "Esta clase ya fue finalizada."
                : "El horario concluyó sin una asistencia guardada.";

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-6 pb-5 sm:px-7 sm:pt-10">
          <header className="flex shrink-0 items-start justify-between gap-4">
            <div>
              <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
                Asistencia de hoy
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="size-4 text-primary" />
                {capitalize(dateFormatter.format(new Date(`${today}T12:00:00-06:00`)))}
              </p>
            </div>
            <ClassCloseMenu
              className={selectedSession?.className ?? null}
              disabled={
                !canCloseManually ||
                !selectedSession ||
                selectedSession.state === "completed"
              }
              endsAt={selectedSession?.endsAt.toISOString() ?? null}
              sessionId={selectedSession?.id ?? null}
              startsAt={selectedSession?.startsAt.toISOString() ?? null}
            />
          </header>

          {params.closed === "manual" ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-[oklch(0.94_0.07_145)] px-4 py-3 text-sm font-semibold text-[oklch(0.34_0.09_145)]">
              <CheckCircle2 className="size-5 shrink-0" />
              Clase cerrada manualmente y guardada en el historial.
            </p>
          ) : null}

          {currentSessions.length ? (
            <section className="mt-5 shrink-0" aria-labelledby="today-classes">
              <h2 id="today-classes" className="mb-2 text-sm font-semibold text-muted-foreground">
                Clases de hoy
              </h2>
              <nav aria-label="Clases disponibles hoy" className="flex gap-2 overflow-x-auto pb-1">
                {currentSessions.map((item) => (
                  <SessionLink
                    key={item.id}
                    active={item.id === selectedSession?.id}
                    session={item}
                  />
                ))}
              </nav>
            </section>
          ) : null}

          {previousSessions.length ? (
            <details className="mt-3 shrink-0 rounded-xl border bg-secondary/30 px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">
                Clases cerradas ({previousSessions.length})
              </summary>
              <nav className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Clases cerradas">
                {previousSessions.map((item) => (
                  <SessionLink
                    key={item.id}
                    active={item.id === selectedSession?.id}
                    session={item}
                  />
                ))}
              </nav>
            </details>
          ) : null}

          {user ? (
            <AttendanceList
              key={selectedSession?.id ?? "sin-clase"}
              sessionId={selectedSession?.id ?? null}
              students={students}
              mode={mode}
              initialPresentIds={
                selectedSession ? presentBySession.get(selectedSession.id) ?? [] : []
              }
              canFinalize={canFinalize}
              unavailableMessage={unavailableMessage}
            />
          ) : (
            <p className="mt-10 rounded-2xl bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
              Inicia sesión para consultar la clase y tomar asistencia.
            </p>
          )}
        </div>

        <AppNav />
      </div>
    </main>
  );
}
