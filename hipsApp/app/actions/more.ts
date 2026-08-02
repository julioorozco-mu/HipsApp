"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type MoreActionState = { error: string | null };

type ScheduleInput = { end: string; start: string };
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ExistingClass = {
  duration_minutes: number;
  id: string;
  name: string;
  start_time: string;
  weekday: number;
};
type StoredBusinessDay = {
  day: number;
  enabled: boolean;
  end?: string;
  intervals?: ScheduleInput[];
  start?: string;
};

const dayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function minutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${
    hour >= 12 ? "p. m." : "a. m."
  }`;
}

function overlaps(left: ScheduleInput, right: ScheduleInput) {
  return minutes(left.start) < minutes(right.end) && minutes(left.end) > minutes(right.start);
}

function schedules(formData: FormData): ScheduleInput[] {
  try {
    const parsed = JSON.parse(value(formData, "schedules")) as ScheduleInput[];
    return parsed.filter(
      (item) =>
        /^\d{2}:\d{2}$/.test(item.start) &&
        /^\d{2}:\d{2}$/.test(item.end) &&
        minutes(item.end) > minutes(item.start)
    );
  } catch {
    return [];
  }
}

function intervalsOverlap(intervals: ScheduleInput[]) {
  const sorted = [...intervals].sort(
    (left, right) => minutes(left.start) - minutes(right.start)
  );
  return sorted.some((interval, index) => {
    const next = sorted[index + 1];
    return Boolean(next && overlaps(interval, next));
  });
}

async function findClassConflict(
  supabase: SupabaseClient,
  weekdays: number[],
  intervals: ScheduleInput[],
  excludeId?: string
) {
  const baseQuery = supabase
    .from("classes")
    .select("id, name, weekday, start_time, duration_minutes")
    .eq("active", true)
    .in("weekday", weekdays);
  const { data, error } = excludeId
    ? await baseQuery.neq("id", excludeId)
    : await baseQuery;

  if (error) return { error: error.message, conflict: null };

  const existingClasses = (data ?? []) as ExistingClass[];
  for (const existing of existingClasses) {
    const existingStart = minutes(existing.start_time);
    const existingInterval = {
      start: existing.start_time.slice(0, 5),
      end: `${String(Math.floor((existingStart + existing.duration_minutes) / 60)).padStart(
        2,
        "0"
      )}:${String((existingStart + existing.duration_minutes) % 60).padStart(2, "0")}`,
    };

    for (const interval of intervals) {
      if (overlaps(interval, existingInterval)) {
        return {
          error: null,
          conflict: `El ${dayNames[existing.weekday]} ya existe “${existing.name}” a las ${timeLabel(
            existing.start_time
          )}.`,
        };
      }
    }
  }

  return { error: null, conflict: null };
}

function normalizeBusinessHours(raw: string) {
  try {
    const parsed = JSON.parse(raw) as StoredBusinessDay[];
    if (!Array.isArray(parsed)) return { error: "El horario configurado no es válido." };

    const days = Array.from({ length: 7 }, (_, day) => {
      const stored = parsed.find((item) => Number(item.day) === day);
      if (!stored) return { day, enabled: false, intervals: [] as ScheduleInput[] };

      const intervals = Array.isArray(stored.intervals)
        ? stored.intervals
        : stored.start && stored.end
          ? [{ start: stored.start, end: stored.end }]
          : [];

      return {
        day,
        enabled: Boolean(stored.enabled),
        intervals: intervals.map((interval) => ({
          start: String(interval.start ?? ""),
          end: String(interval.end ?? ""),
        })),
      };
    });

    for (const day of days) {
      if (!day.enabled) continue;
      if (!day.intervals.length) {
        return { error: `Agrega al menos un horario para ${dayNames[day.day]}.` };
      }
      if (
        day.intervals.some(
          (interval) =>
            !/^\d{2}:\d{2}$/.test(interval.start) ||
            !/^\d{2}:\d{2}$/.test(interval.end) ||
            minutes(interval.end) <= minutes(interval.start)
        )
      ) {
        return { error: `Corrige la hora de inicio y fin del ${dayNames[day.day]}.` };
      }
      if (intervalsOverlap(day.intervals)) {
        return { error: `Los horarios del ${dayNames[day.day]} no pueden superponerse.` };
      }
    }

    return { value: JSON.stringify(days), error: null };
  } catch {
    return { error: "El horario configurado no es válido." };
  }
}

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);

  return {
    role: normalizeRole(String(profile.role)),
    supabase,
    user,
  };
}

export async function updateProfile(
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const { role, supabase, user } = await session();
  if (role === "superadmin") {
    return { error: "El perfil del Superadmin no permite editar datos de identidad." };
  }

  const fullName = value(formData, "full_name");
  const whatsapp = value(formData, "whatsapp");
  if (fullName.length < 3) return { error: "Ingresa un nombre válido." };
  if (whatsapp && !/^\+[1-9][0-9]{7,14}$/.test(whatsapp)) {
    return {
      error: "Usa WhatsApp en formato internacional, por ejemplo +525512345678.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      whatsapp: whatsapp || null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/mas");
  revalidatePath("/perfil");
  redirect("/perfil");
}

export async function changePassword(
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const password = value(formData, "password");
  const confirmation = value(formData, "password_confirmation");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmation) {
    return { error: "Las contraseñas no coinciden." };
  }

  const { supabase } = await session();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/perfil?password=updated");
}

export async function createClass(
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const { role, supabase, user } = await session();
  if (!canManageOperations(role)) return { error: "No tienes permisos para crear clases." };

  const name = value(formData, "name");
  const weekdays = [...new Set(formData.getAll("weekday").map(Number))].filter(
    (day) => day >= 0 && day <= 6
  );
  const intervals = schedules(formData);
  const capacity = Number(value(formData, "capacity"));

  if (!name || !weekdays.length || !intervals.length) {
    return { error: "Completa nombre, días y al menos un intervalo válido." };
  }
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 500) {
    return { error: "El cupo debe estar entre 1 y 500." };
  }
  if (intervals.some(({ start, end }) => minutes(end) - minutes(start) < 15)) {
    return { error: "Cada intervalo debe durar al menos 15 minutos." };
  }
  if (intervalsOverlap(intervals)) {
    return { error: "Los intervalos de la nueva clase no pueden superponerse." };
  }

  const availability = await findClassConflict(supabase, weekdays, intervals);
  if (availability.error) return { error: availability.error };
  if (availability.conflict) return { error: availability.conflict };

  const rows = weekdays.flatMap((weekday) =>
    intervals.map(({ start, end }) => ({
      capacity,
      duration_minutes: minutes(end) - minutes(start),
      instructor_id: user.id,
      name,
      start_time: start,
      weekday,
    }))
  );

  const { error } = await supabase.from("classes").insert(rows as never);
  if (error) {
    return {
      error: error.message.includes("classes_time_overlap")
        ? "Ya existe una clase que se cruza con ese horario."
        : error.message,
    };
  }
  revalidatePath("/clases");
  revalidatePath("/asistencia");
  redirect("/clases");
}

export async function updateClass(
  id: string,
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const { role, supabase } = await session();
  if (!canManageOperations(role)) return { error: "No tienes permisos para editar clases." };

  const name = value(formData, "name");
  const weekday = Number(formData.get("weekday"));
  const [interval] = schedules(formData);
  const capacity = Number(value(formData, "capacity"));
  if (!name || !interval || weekday < 0 || weekday > 6) {
    return { error: "Completa nombre, día e intervalo." };
  }
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 500) {
    return { error: "El cupo debe estar entre 1 y 500." };
  }

  const availability = await findClassConflict(supabase, [weekday], [interval], id);
  if (availability.error) return { error: availability.error };
  if (availability.conflict) return { error: availability.conflict };

  const { error } = await supabase
    .from("classes")
    .update({
      capacity,
      duration_minutes: minutes(interval.end) - minutes(interval.start),
      name,
      start_time: interval.start,
      weekday,
    } as never)
    .eq("id", id);
  if (error) {
    return {
      error: error.message.includes("classes_time_overlap")
        ? "Ya existe una clase que se cruza con ese horario."
        : error.message,
    };
  }

  revalidatePath("/clases");
  revalidatePath("/asistencia");
  redirect("/clases");
}

export async function deleteClass(id: string, _formData: FormData) {
  const { role, supabase } = await session();
  if (!canManageOperations(role)) redirect("/mas");

  const { error } = await supabase
    .from("classes")
    .update({ active: false } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/clases");
  revalidatePath("/asistencia");
}

export async function saveTemplate(
  id: string | null,
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const { role, supabase } = await session();
  if (!canManageOperations(role)) {
    return { error: "No tienes permisos para administrar plantillas." };
  }

  const name = value(formData, "name");
  const kind = value(formData, "kind") || "recordatorio";
  const body = value(formData, "body");
  if (!name || !body) return { error: "Completa nombre y mensaje." };
  if (body.length > 400) return { error: "El mensaje no puede superar 400 caracteres." };

  const payload = {
    active: true,
    body,
    kind,
    name,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("message_templates").update(payload as never).eq("id", id)
    : supabase.from("message_templates").insert(payload as never);
  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath("/plantillas");
  redirect("/plantillas");
}

export async function updateSettings(
  _state: MoreActionState,
  formData: FormData
): Promise<MoreActionState> {
  const { role, supabase } = await session();
  if (!canManageOperations(role)) {
    return { error: "No tienes permisos para modificar la configuración." };
  }

  const businessHours = normalizeBusinessHours(value(formData, "business_hours"));
  if (businessHours.error || !businessHours.value) {
    return { error: businessHours.error ?? "El horario configurado no es válido." };
  }

  const payload: Record<string, string | boolean> = {
    appearance: value(formData, "appearance") || "system",
    business_hours: businessHours.value,
    currency: "MXN",
    notifications_enabled: formData.get("notifications_enabled") === "on",
    timezone: "America/Mexico_City",
    updated_at: new Date().toISOString(),
  };

  if (role === "superadmin") {
    payload.academy_name = value(formData, "academy_name") || "Hipsdance";
    payload.address = value(formData, "address");
  }

  const { error } = await supabase
    .from("academy_settings")
    .update(payload as never)
    .eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/configuracion");
  return { error: null };
}
