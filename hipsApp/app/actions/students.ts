"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type StudentFormState = {
  error: string | null;
};

const PHONE_LOCAL_MX = /^\d{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type ParsedStudentForm =
  | { error: string; data?: undefined }
  | {
      error: null;
      data: { nombre: string; telefono: string; objetivo_peso_grasa: number | null };
    };

type ParsedNewStudentForm =
  | { error: string; data?: undefined; realizarPago?: undefined }
  | {
      error: null;
      data: {
        nombre: string;
        telefono: string;
        correo: string;
        objetivo_peso_grasa: number | null;
        cumpleanos: string;
        fecha_registro: string;
      };
      realizarPago: boolean;
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

  if (nombre.length > 120) {
    return { error: "El nombre no puede exceder 120 caracteres." };
  }

  if (!PHONE_LOCAL_MX.test(telefonoLocal)) {
    return {
      error: "Teléfono inválido. Ingresa los 10 dígitos, ej. 9991234567.",
    };
  }

  const objetivo_peso_grasa = objetivoRaw ? Number(objetivoRaw) : null;

  if (
    objetivoRaw &&
    (Number.isNaN(objetivo_peso_grasa) ||
      objetivo_peso_grasa! < 1 ||
      objetivo_peso_grasa! > 500)
  ) {
    return { error: "El peso ideal debe estar entre 1 y 500 kg." };
  }

  return {
    error: null,
    data: { nombre, telefono: `+52${telefonoLocal}`, objetivo_peso_grasa },
  };
}

function parseNewStudentForm(formData: FormData): ParsedNewStudentForm {
  const parsed = parseStudentForm(formData);
  if (!parsed.data) return parsed;

  const cumpleanos = String(formData.get("cumpleanos") ?? "").trim();
  const fechaIngreso = String(formData.get("fecha_ingreso") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

  if (!isValidIsoDate(cumpleanos)) {
    return { error: "Selecciona la fecha de cumpleaños." };
  }

  if (!EMAIL.test(correo) || correo.length > 254) {
    return { error: "Ingresa un correo válido." };
  }

  if (cumpleanos > today) {
    return { error: "El cumpleaños no puede estar en el futuro." };
  }

  if (!isValidIsoDate(fechaIngreso)) {
    return { error: "Selecciona la fecha de ingreso." };
  }

  if (fechaIngreso > today) {
    return { error: "La fecha de ingreso no puede estar en el futuro." };
  }

  return {
    error: null,
    data: {
      ...parsed.data,
      correo,
      cumpleanos,
      fecha_registro: `${fechaIngreso}T12:00:00.000Z`,
    },
    realizarPago: formData.get("realizar_pago") === "on",
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

  const parsed = parseNewStudentForm(formData);
  if (!parsed.data) return { error: parsed.error };

  const { data: student, error } = await supabase
    .from("students")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un alumno con ese WhatsApp." };
    }
    return { error: `No se pudo registrar al alumno: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/alumnos");
  revalidatePath("/asistencia");

  redirect(
    parsed.realizarPago
      ? `/membresias/registrar?student=${student.id}`
      : `/alumnos/nuevo?creado=${student.id}`
  );
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
  revalidatePath("/alumnos");
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
  revalidatePath("/alumnos");
  revalidatePath("/asistencia");

  return { error: null };
}
