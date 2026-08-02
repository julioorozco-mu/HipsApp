"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type CreateUserState = { error: string | null };
export type ManageUserState = { error: string | null };

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function mexicoPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  return null;
}

function userError(message: string, operation: "crear" | "actualizar" | "eliminar") {
  if (message.includes("email already registered")) return "Ese correo ya está registrado.";
  if (message.includes("password too short")) return "La contraseña debe tener al menos 8 caracteres.";
  if (message.includes("student phone required") || message.includes("invalid mexico phone")) {
    return "Ingresa los 10 dígitos del teléfono celular.";
  }
  if (message.includes("superadmin required")) return "Solo el Superadmin puede administrar usuarios.";
  if (message.includes("protected superadmin")) return "La cuenta Superadmin está protegida y no puede modificarse ni eliminarse.";
  if (message.includes("managed user not found")) return "El usuario ya no existe.";
  if (message.includes("user has payments")) {
    return "No se puede eliminar este alumno porque tiene pagos registrados.";
  }
  if (message.includes("students_telefono_key")) return "Ese teléfono ya pertenece a otro alumno.";
  return `No se pudo ${operation} el usuario.`;
}

async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para administrar usuarios.", supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (normalizeRole(profile?.role) !== "superadmin") {
    return { error: "Solo el Superadmin puede administrar usuarios.", supabase: null };
  }

  return { error: null, supabase };
}

export async function createManagedUser(
  _state: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const fullName = value(formData, "full_name");
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = value(formData, "role");
  const phone = role === "alumno" ? mexicoPhone(value(formData, "phone")) : null;

  if (fullName.length < 3) return { error: "Ingresa el nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Ingresa un correo válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!["admin", "alumno"].includes(role)) return { error: "Selecciona Administrador o Alumno." };
  if (role === "alumno" && !phone) return { error: "Ingresa los 10 dígitos del teléfono celular." };

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase.rpc("create_app_user" as never, {
    p_email: email,
    p_full_name: fullName,
    p_password: password,
    p_phone: phone,
    p_role: role,
  } as never);

  if (error) return { error: userError(error.message, "crear") };

  revalidatePath("/");
  revalidatePath("/usuarios");
  revalidatePath("/alumnos");
  redirect("/usuarios?created=1");
}

export async function updateManagedUser(
  _state: ManageUserState,
  formData: FormData
): Promise<ManageUserState> {
  const userId = value(formData, "user_id");
  const fullName = value(formData, "full_name");
  const email = value(formData, "email").toLowerCase();
  const role = value(formData, "role");
  const rawPassword = String(formData.get("password") ?? "");
  const phone = role === "alumno" ? mexicoPhone(value(formData, "phone")) : null;

  if (!userId) return { error: "No se pudo identificar al usuario." };
  if (fullName.length < 3) return { error: "Ingresa el nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Ingresa un correo válido." };
  if (rawPassword && rawPassword.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (role === "alumno" && !phone) return { error: "Ingresa los 10 dígitos del teléfono celular." };

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase.rpc("update_app_user" as never, {
    p_email: email,
    p_full_name: fullName,
    p_password: rawPassword || null,
    p_phone: phone,
    p_user_id: userId,
  } as never);

  if (error) return { error: userError(error.message, "actualizar") };

  revalidatePath("/");
  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${userId}/editar`);
  revalidatePath("/alumnos");
  redirect("/usuarios?updated=1");
}

export async function deleteManagedUser(
  _state: ManageUserState,
  formData: FormData
): Promise<ManageUserState> {
  const userId = value(formData, "user_id");
  if (!userId) return { error: "No se pudo identificar al usuario." };

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase.rpc("delete_app_user" as never, {
    p_user_id: userId,
  } as never);

  if (error) return { error: userError(error.message, "eliminar") };

  revalidatePath("/");
  revalidatePath("/usuarios");
  revalidatePath("/alumnos");
  redirect("/usuarios?deleted=1");
}
