import Link from "next/link";
import {
  BadgeDollarSign,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Flame,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import {
  NotificationCenter,
  type ClassNotificationStatus,
  type HomeNotification,
} from "@/components/features/home/notification-center";
import { Card } from "@/components/ui/card";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const classTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

const notificationDateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "short",
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

type SessionRow = {
  attendance_saved_at: string | null;
  class_id: string | null;
  class_name: string | null;
  finished_at: string | null;
  id: string | null;
  starts_at: string | null;
  status: string | null;
};

type HomeSession = {
  attendanceSaved: boolean;
  className: string;
  endsAt: Date;
  finishedAt: Date | null;
  id: string;
  lifecycle: ClassNotificationStatus;
  startsAt: Date;
};

function greetingName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/).slice(0, 2).join(" ") ?? "";
}

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

function classLifecycle(
  status: string,
  attendanceSaved: boolean,
  startsAt: Date,
  endsAt: Date,
  now: Date
): ClassNotificationStatus {
  if (status === "completada") return "completed";
  if (attendanceSaved) {
    return now > endsAt ? "closing" : "in_progress";
  }
  const opensAt = new Date(startsAt.getTime() - 15 * 60 * 1000);
  if (now < opensAt) return "scheduled";
  if (now < startsAt) return "ready";
  if (now <= endsAt) return "started";
  return "missed";
}

function notificationDescription(session: HomeSession) {
  const start = notificationDateFormatter.format(session.startsAt);
  const end = classTimeFormatter.format(session.endsAt);

  if (session.lifecycle === "scheduled") return `Programada para ${start}.`;
  if (session.lifecycle === "ready") {
    return `La asistencia ya está disponible. Inicia a las ${classTimeFormatter.format(session.startsAt)}.`;
  }
  if (session.lifecycle === "started") {
    return `Inició a las ${classTimeFormatter.format(session.startsAt)}. Falta guardar asistencia.`;
  }
  if (session.lifecycle === "in_progress") {
    return `Inició a las ${classTimeFormatter.format(session.startsAt)} y termina a las ${end}.`;
  }
  if (session.lifecycle === "closing") {
    return `El horario terminó a las ${end}. Falta cerrar la sesión.`;
  }
  if (session.lifecycle === "completed") {
    return `Cerrada ${session.finishedAt ? notificationDateFormatter.format(session.finishedAt) : "correctamente"}.`;
  }
  return `El horario terminó a las ${end} sin asistencia guardada.`;
}

function sessionHref(session: HomeSession) {
  if (session.lifecycle === "closing") {
    return `/asistencia/finalizar?session=${session.id}`;
  }
  return `/asistencia?session=${session.id}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = mexicoDate();
  const range = dayRange(today);
  const now = new Date();

  if (user) {
    const { error: ensureError } = await supabase.rpc(
      "ensure_daily_class_sessions" as never,
      { p_date: today } as never
    );
    if (ensureError) {
      throw new Error(`No se pudieron preparar las clases de hoy: ${ensureError.message}`);
    }
  }

  const results = user
    ? await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("student_overview")
          .select("*", { count: "exact", head: true })
          .eq("membership_status", "por_vencer"),
        supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, starts_at, status, attendance_saved_at, finished_at"
          )
          .gte("starts_at", range.start)
          .lt("starts_at", range.end)
          .neq("status", "cancelada")
          .order("starts_at"),
        supabase
          .from("profiles")
          .select("full_name, current_class_streak, role")
          .eq("id", user.id)
          .maybeSingle(),
      ])
    : null;

  const studentCount = results?.[0].count ?? 0;
  const expiringCount = results?.[1].count ?? 0;
  const sessionRows = (results?.[2].data ?? []) as SessionRow[];
  const profile = results?.[3].data ?? null;
  const sessionError = results?.[2].error;
  if (sessionError) {
    throw new Error(`No se pudieron cargar las clases de hoy: ${sessionError.message}`);
  }

  const classIds = sessionRows.flatMap((session) =>
    session.class_id ? [session.class_id] : []
  );
  const { data: classRows, error: classError } =
    user && classIds.length
      ? await supabase
          .from("classes")
          .select("id, duration_minutes")
          .in("id", classIds)
      : { data: [], error: null };

  if (classError) {
    throw new Error(`No se pudo calcular la duración de las clases: ${classError.message}`);
  }

  const durationByClass = new Map(
    (classRows ?? []).map((item) => [item.id, item.duration_minutes])
  );
  const sessions: HomeSession[] = sessionRows.flatMap((session) => {
    if (!session.id || !session.class_id || !session.class_name || !session.starts_at) {
      return [];
    }
    const startsAt = new Date(session.starts_at);
    const durationMinutes = durationByClass.get(session.class_id) ?? 60;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
    const attendanceSaved = Boolean(session.attendance_saved_at);
    return [
      {
        attendanceSaved,
        className: session.class_name,
        endsAt,
        finishedAt: session.finished_at ? new Date(session.finished_at) : null,
        id: session.id,
        lifecycle: classLifecycle(
          session.status ?? "programada",
          attendanceSaved,
          startsAt,
          endsAt,
          now
        ),
        startsAt,
      },
    ];
  });

  const role = normalizeRole(profile?.role);
  const isSuperadmin = role === "superadmin";
  const canManage = canManageOperations(role);
  const classStreak = profile?.current_class_streak ?? 0;
  const highlightedSession =
    sessions.find((session) => session.lifecycle === "in_progress") ??
    sessions.find((session) => session.lifecycle === "started") ??
    sessions.find((session) => session.lifecycle === "ready") ??
    sessions.find((session) => session.lifecycle === "scheduled") ??
    sessions.find((session) => session.lifecycle === "closing") ??
    null;
  const nextClassTime = highlightedSession
    ? classTimeFormatter.format(highlightedSession.startsAt)
    : null;
  const peopleHref = isSuperadmin ? "/usuarios" : "/alumnos";
  const peopleLabel = isSuperadmin ? "usuarios" : "alumnos";
  const displayName = greetingName(profile?.full_name);
  const notifications: HomeNotification[] = sessions.map((session) => ({
    classStatus: session.lifecycle,
    description: notificationDescription(session),
    href: sessionHref(session),
    id: `class-${session.id}-${session.lifecycle}`,
    kind: "class",
    title: session.className,
  }));

  if (expiringCount > 0) {
    notifications.push({
      id: `memberships-expiring-${expiringCount}`,
      kind: "membership",
      title: `${expiringCount} membresía${expiringCount === 1 ? "" : "s"} por vencer`,
      description: "Revisa los alumnos que requieren renovación de membresía.",
      href: "/membresias",
    });
  }

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-7 sm:px-8 sm:pt-12">
          <header className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-[clamp(1.7rem,8vw,2.25rem)] leading-tight font-bold tracking-[-0.04em]">
              Hola{displayName ? `, ${displayName}` : ""}{" "}
              <span aria-hidden="true">👋</span>
            </h1>
            <NotificationCenter
              items={notifications}
              userId={user?.id ?? "anonymous"}
            />
          </header>

          <section className="mt-1 sm:mt-3" aria-labelledby="resumen">
            <h2
              id="resumen"
              className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]"
            >
              Resumen de hoy
            </h2>
            <div className="mt-1 grid grid-cols-3 gap-2.5 sm:gap-3">
              <Card className="min-w-0 h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.59_0.25_295)] px-1.5 py-2 text-center text-[oklch(0.985_0.006_300)] ring-0 shadow-[inset_0_1px_oklch(1_0_0/0.18)] sm:px-2">
                <CalendarDays className="size-8 shrink-0" strokeWidth={2.5} />
                <p className="mt-1 max-w-full truncate px-1 text-sm sm:text-base">
                  {highlightedSession?.className ?? "Sin clase"}
                </p>
                <p className="max-w-full truncate text-[clamp(1.05rem,5.2vw,1.65rem)] leading-none font-semibold tracking-[-0.04em]">
                  {nextClassTime ?? "—"}
                </p>
              </Card>

              <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.91_0.08_125)] px-2 py-2 text-center ring-0">
                <UsersRound className="size-9" strokeWidth={2.35} />
                <p className="mt-1 text-[2rem] leading-none font-bold">
                  {studentCount}
                </p>
                <p className="text-sm font-medium sm:text-base">alumnos</p>
              </Card>

              <Link
                href="/membresias"
                aria-label={`${expiringCount} membresías por vencer`}
                className="rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.92_0.18_110)] px-2 py-2 text-center ring-0 transition-colors hover:bg-[oklch(0.89_0.19_110)]">
                  <Clock3 className="size-9" strokeWidth={2.25} />
                  <p className="mt-1 text-[2rem] leading-none font-bold">
                    {expiringCount}
                  </p>
                  <p className="text-sm font-medium sm:text-base">por vencer</p>
                </Card>
              </Link>
            </div>
          </section>

          <section className="mt-3" aria-labelledby="acciones">
            <h2
              id="acciones"
              className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]"
            >
              Acciones rápidas
            </h2>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Link
                href="/asistencia"
                className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.965_0.035_295)] px-4 py-2 text-center text-xl font-semibold leading-tight transition-colors hover:bg-[oklch(0.94_0.055_295)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.92_0.07_295)]"
              >
                <UserRoundCheck className="size-10" strokeWidth={2.35} />
                <span>
                  Tomar
                  <br />
                  asistencia
                </span>
              </Link>
              <Link
                href={peopleHref}
                className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.965_0.035_340)] px-4 py-2 text-center text-xl font-semibold leading-tight transition-colors hover:bg-[oklch(0.94_0.055_340)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.92_0.07_340)]"
              >
                <UsersRound className="size-10" strokeWidth={2.35} />
                <span>
                  Ver
                  <br />
                  {peopleLabel}
                </span>
              </Link>
              {canManage ? (
                <>
                  <Link
                    href="/membresias"
                    className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.96_0.05_115)] px-4 py-2 text-center text-lg font-semibold leading-tight transition-colors hover:bg-[oklch(0.93_0.08_115)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <BadgeDollarSign className="size-10" strokeWidth={2.2} />
                    <span>Membresías</span>
                  </Link>
                  <Link
                    href="/reportes/pagos"
                    className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.95_0.04_250)] px-4 py-2 text-center text-lg font-semibold leading-tight transition-colors hover:bg-[oklch(0.92_0.07_250)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <ChartNoAxesCombined className="size-10" strokeWidth={2.2} />
                    <span>Reporte de pagos</span>
                  </Link>
                </>
              ) : null}
            </div>
          </section>

          <Card className="mt-4 grid min-h-[7.25rem] grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 rounded-3xl border-0 bg-[oklch(0.965_0.035_340)] pr-4 pl-2 py-4 ring-0">
            <Flame
              aria-hidden="true"
              className="row-span-2 size-10 text-primary"
              fill="currentColor"
            />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Racha de clases</h2>
              <p className="text-lg font-semibold text-primary">¡Sigue así!</p>
            </div>
            <p className="row-span-2 text-center">
              <span className="block text-5xl leading-none font-bold">
                {classStreak}
              </span>
              <span className="text-lg font-semibold">clases</span>
            </p>
            <div
              className="col-start-2 flex items-center gap-1 text-primary"
              aria-label={`${classStreak} clases consecutivas`}
            >
              {Array.from({ length: 7 }, (_, index) => (
                <Flame
                  key={index}
                  className={`size-6 ${
                    index < Math.min(classStreak, 7)
                      ? "text-primary"
                      : "text-[oklch(0.78_0.015_300)]"
                  }`}
                  fill="currentColor"
                />
              ))}
            </div>
          </Card>
        </div>

        <AppNav />
      </div>
    </main>
  );
}
