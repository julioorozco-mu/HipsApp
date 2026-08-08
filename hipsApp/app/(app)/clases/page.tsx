import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import {
  ClassesClient,
  type ClassItem,
  type ClassSessionItem,
} from "@/components/features/more/classes-client";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  active: boolean;
  capacity?: number;
  duration_minutes: number;
  id: string;
  name: string;
  start_time: string;
  weekday: number;
};

type SessionRow = {
  attendance_saved_at: string | null;
  class_id: string;
  closure_mode: string | null;
  closure_reason: string | null;
  finished_at: string | null;
  id: string;
  starts_at: string;
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

function validDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");

  if (selectedDate === today) {
    const { error: ensureError } = await supabase.rpc(
      "ensure_daily_class_sessions" as never,
      { p_date: today } as never
    );
    if (ensureError) {
      throw new Error(`No se pudieron preparar las clases de hoy: ${ensureError.message}`);
    }
  }

  // Mantiene consistente el estado histórico incluso si el cron acaba de vencer.
  await supabase.rpc("close_expired_class_sessions" as never);

  const [classesResult, sessionsResult] = await Promise.all([
    supabase.from("classes").select("*").order("start_time"),
    supabase
      .from("class_sessions")
      .select("*")
      .gte("starts_at", range.start)
      .lt("starts_at", range.end)
      .neq("status", "cancelada")
      .order("starts_at"),
  ]);

  if (classesResult.error || sessionsResult.error) {
    throw new Error(
      `No se pudieron cargar las clases: ${
        classesResult.error?.message ?? sessionsResult.error?.message
      }`
    );
  }

  const classRows = (classesResult.data ?? []) as ClassRow[];
  const sessionRows = (sessionsResult.data ?? []) as unknown as SessionRow[];
  const sessionIds = sessionRows.map((session) => session.id);
  const attendanceResult = sessionIds.length
    ? await supabase
        .from("attendance")
        .select("session_id, status")
        .in("session_id", sessionIds)
        .eq("status", "presente")
    : { data: [], error: null };

  if (attendanceResult.error) {
    throw new Error(`No se pudo cargar el histórico de asistencia: ${attendanceResult.error.message}`);
  }

  const presentCount = new Map<string, number>();
  for (const row of attendanceResult.data ?? []) {
    presentCount.set(row.session_id, (presentCount.get(row.session_id) ?? 0) + 1);
  }

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
      name: template?.name ?? "Clase",
      presentCount: presentCount.get(session.id) ?? 0,
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
