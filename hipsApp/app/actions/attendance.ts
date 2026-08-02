"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type SaveAttendanceResult = {
  error: string | null;
};

function attendanceError(message: string) {
  if (message.includes("attendance not open yet")) {
    return "La asistencia se habilita 15 minutos antes de iniciar la clase.";
  }
  if (message.includes("attendance window closed")) {
    return "El horario de esta clase ya terminó y la asistencia está cerrada.";
  }
  if (message.includes("attendance already saved")) {
    return "La asistencia de esta clase ya fue guardada. Continúa a Finalizar clase.";
  }
  if (message.includes("class session is closed")) {
    return "Esta clase ya fue finalizada o cancelada.";
  }
  if (message.includes("invalid active student selection")) {
    return "Uno de los alumnos seleccionados ya no está disponible para asistencia.";
  }
  return `No se pudo guardar la asistencia: ${message}`;
}

export async function saveAttendance(
  sessionId: string,
  presentStudentIds: string[]
): Promise<SaveAttendanceResult> {
  const present = [...new Set(presentStudentIds.filter(Boolean))];

  if (!sessionId || present.length === 0 || present.length !== presentStudentIds.length) {
    return { error: "Marca al menos un alumno como presente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para guardar la asistencia." };
  }

  const { error } = await supabase.rpc("save_attendance", {
    p_absent: [],
    p_present: present,
    p_session_id: sessionId,
  });

  if (error) {
    return { error: attendanceError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/asistencia/finalizar");

  return { error: null };
}
