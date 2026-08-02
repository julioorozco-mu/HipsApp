"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type CreateUserState = { error: string | null };

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function userError(message: string) {
  if (message.includes("email already registered")) {
    return "Ese correo ya está registrado.";
  }
  if (message.includes("password too short")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (message.includes("student phone required")) {
    return "El teléfono es obligatorio para alumnos.";
  }
  if (message.includes("superadmin required")) {
    return "Solo el Superadmin puede crear usuarios.";
  }
  return `No se pudo crear el usuario: ${message}`;
}

export async function createManagedUser(
  _state: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const fullName = value(formData, "full_name");
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = value(formData, "role");
  const phone = value(formData, "phone");

  if (fullName.length < 3) return { error: "Ingresa el nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Ingresa un correo válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!["admin", "alumno"].includes(role)) {
    return { error: "Selecciona Administrador o Alumno." };
  }
  if (role === "alumno" && !/^\+?[0-9]{8,15}$/.test(phone)) {
    return { error: "Ingresa el teléfono del alumno con 8 a 15 dígitos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para crear usuarios." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (normalizeRole(profile?.role) !== "superadmin") {
    return { error: "Solo el Superadmin puede crear usuarios." };
  }

  const { error } = await supabase.rpc("create_app_user" as never, {
    p_email: email,
    p_full_name: fullName,
    p_password: password,
    p_phone: role === "alumno" ? phone : null,
    p_role: role,
  } as never);

  if (error) return { error: userError(error.message) };

  revalidatePath("/");
  revalidatePath("/usuarios");
  revalidatePath("/alumnos");
  redirect("/usuarios?created=1");
}
