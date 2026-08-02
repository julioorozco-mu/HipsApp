"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type SaveAttendanceResult = {
  error: string | null;
};

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
    return { error: `No se pudo guardar la asistencia: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");

  return { error: null };
}
