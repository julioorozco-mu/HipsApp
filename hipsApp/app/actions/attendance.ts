"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AttendanceStatus = "presente" | "ausente";

type AttendanceSelection = {
  studentId: string;
  status: AttendanceStatus | undefined;
};

type SaveAttendanceResult = {
  error: string | null;
};

export async function saveAttendance(
  sessionId: string,
  selections: AttendanceSelection[]
): Promise<SaveAttendanceResult> {
  if (
    !sessionId ||
    selections.length === 0 ||
    selections.some(({ studentId, status }) => !studentId || !status) ||
    new Set(selections.map(({ studentId }) => studentId)).size !==
      selections.length
  ) {
    return { error: "Marca presente o ausente para cada alumno." };
  }

  const present: string[] = [];
  const absent: string[] = [];
  for (const { studentId, status } of selections) {
    (status === "presente" ? present : absent).push(studentId);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para guardar la asistencia." };
  }

  const { error } = await supabase.rpc("save_attendance", {
    p_absent: absent,
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
