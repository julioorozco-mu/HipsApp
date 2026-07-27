"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AddStudentState = {
  error: string | null;
};

const PHONE_LOCAL_MX = /^\d{10}$/;

export async function addStudent(
  _prevState: AddStudentState,
  formData: FormData
): Promise<AddStudentState> {
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

  const telefono = `+52${telefonoLocal}`;

  const objetivo_peso_grasa = objetivoRaw ? Number(objetivoRaw) : null;

  if (objetivoRaw && (Number.isNaN(objetivo_peso_grasa) || objetivo_peso_grasa! < 0)) {
    return { error: "El objetivo de peso/grasa debe ser un numero valido." };
  }

  const supabase = await createClient();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({ nombre, telefono, objetivo_peso_grasa })
    .select("id")
    .single();

  if (studentError) {
    return { error: `No se pudo registrar al alumno: ${studentError.message}` };
  }

  const fechaInicio = new Date();
  const fechaVencimiento = new Date(fechaInicio);
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

  const { error: membershipError } = await supabase.from("memberships").insert({
    student_id: student.id,
    estado: "activa",
    fecha_inicio: fechaInicio.toISOString().slice(0, 10),
    fecha_vencimiento: fechaVencimiento.toISOString().slice(0, 10),
  });

  if (membershipError) {
    await supabase.from("students").delete().eq("id", student.id);
    return {
      error: `No se pudo crear la membresia: ${membershipError.message}`,
    };
  }

  revalidatePath("/");

  return { error: null };
}
