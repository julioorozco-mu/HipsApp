"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MoreActionState = { error: string | null };

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  return { supabase, user };
}

export async function updateProfile(_state: MoreActionState, formData: FormData): Promise<MoreActionState> {
  const fullName = value(formData, "full_name");
  const whatsapp = value(formData, "whatsapp");
  if (fullName.length < 3) return { error: "Ingresa un nombre válido." };
  if (whatsapp && !/^\+[1-9][0-9]{7,14}$/.test(whatsapp)) return { error: "Usa WhatsApp en formato internacional, por ejemplo +525512345678." };
  const { supabase, user } = await session();
  const { error } = await supabase.from("profiles").update({
    full_name: fullName,
    whatsapp: whatsapp || null,
    updated_at: new Date().toISOString(),
  } as never).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/mas");
  revalidatePath("/perfil");
  redirect("/perfil");
}

export async function createClass(_state: MoreActionState, formData: FormData): Promise<MoreActionState> {
  const name = value(formData, "name");
  const weekdays = formData.getAll("weekday").map(Number).filter((day) => day >= 0 && day <= 6);
  const startTime = value(formData, "start_time");
  const duration = Number(value(formData, "duration_minutes"));
  const capacity = Number(value(formData, "capacity"));
  if (!name || !weekdays.length || !/^\d{2}:\d{2}$/.test(startTime)) return { error: "Completa nombre, días y hora." };
  if (!Number.isFinite(duration) || duration < 15 || !Number.isFinite(capacity) || capacity < 1) return { error: "Duración o cupo inválido." };
  const { supabase, user } = await session();
  const rows = weekdays.map((weekday) => ({ name, weekday, start_time: startTime, duration_minutes: duration, capacity, instructor_id: user.id }));
  const { error } = await supabase.from("classes").insert(rows as never);
  if (error) return { error: error.message };
  revalidatePath("/clases");
  redirect("/clases");
}

export async function saveTemplate(id: string | null, _state: MoreActionState, formData: FormData): Promise<MoreActionState> {
  const name = value(formData, "name");
  const kind = value(formData, "kind") || "recordatorio";
  const body = value(formData, "body");
  if (!name || !body) return { error: "Completa nombre y mensaje." };
  if (body.length > 400) return { error: "El mensaje no puede superar 400 caracteres." };
  const { supabase } = await session();
  const payload = { name, kind, body, active: true, updated_at: new Date().toISOString() };
  const query = id
    ? supabase.from("message_templates").update(payload as never).eq("id", id)
    : supabase.from("message_templates").insert(payload as never);
  const { error } = await query;
  if (error) return { error: error.message };
  revalidatePath("/plantillas");
  redirect("/plantillas");
}

export async function updateSettings(_state: MoreActionState, formData: FormData): Promise<MoreActionState> {
  const { supabase } = await session();
  const payload = {
    academy_name: value(formData, "academy_name") || "Hipsdance",
    business_hours: value(formData, "business_hours") || "Lun–Vie · 7:00–21:00",
    currency: value(formData, "currency") || "MXN",
    timezone: value(formData, "timezone") || "America/Mexico_City",
    appearance: value(formData, "appearance") || "system",
    notifications_enabled: formData.get("notifications_enabled") === "on",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("academy_settings").update(payload as never).eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { error: null };
}
