import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import {
  ClassesClient,
  type ClassItem,
  type ClassSessionItem,
} from "@/components/features/more/classes-client";
import { ClassesDatePrefetch } from "@/components/features/more/classes-date-prefetch";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  active: boolean;
  capacity: number | null;
  duration_minutes: number;
  id: string;
  name: string;
  start_time: string;
  weekday: number;
};

type SessionRow = {
  attendance_saved_at: string | null;
  class_id: string;
  class_name: string | null;
  closure_mode: string | null;
  closure_reason: string | null;
  finished_at: string | null;
  id: string;
  present_count: number | null;
  starts_at: string;
  status: string;
};

const mexicoDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Mexico_City",
  year: "numeric",
});

const validDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function mexicoDate() {
  const parts = mexicoDateFormatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validDate(value: string | undefined, fallback: string) {
  if (!value || !validDatePattern.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00-06:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : value;
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00-06:00`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  const today = mexicoDate();
  const selectedDate = validDate(params.fecha, today);
  const range = dayRange(selectedDate);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  // Arranca las lecturas independientes cuanto antes. No esperamos `classes`
  // mientras validamos el rol, reduciendo un waterfall en cada cambio de fecha.
  const profilePromise = supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const classesPromise = supabase
    .from("classes")
    .select("id, name, weekday, start_time, duration_minutes, capacity, active")
    .order("start_time");
  const sessionsPromise =
    selectedDate === today
      ? null
      : supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, starts_at, status, attendance_saved_at, finished_at, closure_mode, closure_reason, present_count"
          )
          .gte("starts_at", range.start)
          .lt("starts_at", range.end)
          .neq("status", "cancelada")
          .order("starts_at");

  const { data: profile } = await profilePromise;
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");

  let sessionsResult;
  if (selectedDate === today) {
    const { error: ensureError } = await supabase.rpc(
      "ensure_daily_class_sessions" as never,
      { p_date: today } as never
    );
    if (ensureError) {
      throw new Error(`No se pudieron preparar las clases de hoy: ${ensureError.message}`);
    }

    sessionsResult = await supabase
      .from("session_overview")
      .select(
        "id, class_id, class_name, starts_at, status, attendance_saved_at, finished_at, closure_mode, closure_reason, present_count"
      )
      .gte("starts_at", range.start)
      .lt("starts_at", range.end)
      .neq("status", "cancelada")
      .order("starts_at");
  } else {
    sessionsResult = await sessionsPromise!;
  }

  const classesResult = await classesPromise;

  if (classesResult.error || sessionsResult.error) {
    throw new Error(
      `No se pudieron cargar las clases: ${
        classesResult.error?.message ?? sessionsResult.error?.message
      }`
    );
  }

  const classRows = (classesResult.data ?? []) as ClassRow[];
  const sessionRows = (sessionsResult.data ?? []) as unknown as SessionRow[];
  const classById = new Map(classRows.map((item) => [item.id, item]));

  const classes: ClassItem[] = classRows
    .filter((item) => item.active)
    .map((item) => ({
      capacity: item.capacity ?? 25,
      durationMinutes: item.duration_minutes,
      id: item.id,
      name: item.name,
      startTime: item.start_time,
      weekday: item.weekday,
    }));

  const sessions: ClassSessionItem[] = sessionRows.map((session) => {
    const template = classById.get(session.class_id);
    return {
      activeTemplate: Boolean(template?.active),
      attendanceSaved: Boolean(session.attendance_saved_at),
      capacity: template?.capacity ?? 25,
      classId: session.class_id,
      closureMode: session.closure_mode,
      closureReason: session.closure_reason,
      durationMinutes: template?.duration_minutes ?? 60,
      finishedAt: session.finished_at,
      id: session.id,
      name: session.class_name ?? template?.name ?? "Clase",
      presentCount: Number(session.present_count ?? 0),
      startsAt: session.starts_at,
      status: session.status,
    };
  });

  return (
    <MoreShell
      title="Clases"
      menuHref="/clases/nueva"
      menuLabel="Crear nueva clase"
    >
      <ClassesDatePrefetch selectedDate={selectedDate} />
      <ClassesClient
        classes={classes}
        selectedDate={selectedDate}
        sessions={sessions}
        today={today}
      />
      <Link
        href="/clases/nueva"
        aria-label="Nueva clase"
        className="fixed right-6 bottom-28 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl sm:right-[calc(50%-15rem)]"
      >
        <Plus className="size-7" />
      </Link>
    </MoreShell>
  );
}
