"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type StudentFormState = {
  error: string | null;
};

const PHONE_LOCAL_MX = /^\d{10}$/;

type ParsedStudentForm =
  | { error: string; data?: undefined }
  | {
      error: null;
      data: { nombre: string; telefono: string; objetivo_peso_grasa: number | null };
    };

function parseStudentForm(formData: FormData): ParsedStudentForm {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefonoLocal = String(formData.get("telefono_local") ?? "").replace(
    /\D/g,
    ""
  );
  const objetivoRaw = String(formData.get("objetivo_peso_grasa") ?? "").trim();

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  if (!PHONE_LOCAL_MX.test(telefonoLocal)) {
    return {
      error: "Telefono invalido. Ingresa los 10 digitos, ej. 9991234567.",
    };
  }

  const objetivo_peso_grasa = objetivoRaw ? Number(objetivoRaw) : null;

  if (objetivoRaw && (Number.isNaN(objetivo_peso_grasa) || objetivo_peso_grasa! < 0)) {
    return { error: "El objetivo de peso/grasa debe ser un numero valido." };
  }

  return {
    error: null,
    data: { nombre, telefono: `+52${telefonoLocal}`, objetivo_peso_grasa },
  };
}

export async function addStudent(
  _prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return { error: "Inicia sesión para registrar alumnos." };
  }

  const parsed = parseStudentForm(formData);
  if (!parsed.data) return { error: parsed.error };

  const { error } = await supabase
    .from("students")
    .insert(parsed.data);

  if (error) {
    return { error: `No se pudo registrar al alumno: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");

  return { error: null };
}

export async function updateStudent(
  studentId: string,
  _prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return { error: "Inicia sesión para actualizar alumnos." };
  }

  const parsed = parseStudentForm(formData);
  if (!parsed.data) return { error: parsed.error };

  const { error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", studentId);

  if (error) {
    return { error: `No se pudo actualizar al alumno: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");

  return { error: null };
}

export async function deleteStudent(
  studentId: string
): Promise<StudentFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para eliminar alumnos." };
  }

  const { error } = await supabase.from("students").delete().eq("id", studentId);

  if (error) {
    return { error: `No se pudo eliminar al alumno: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");

  return { error: null };
}
