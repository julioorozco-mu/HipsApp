"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markAttendance(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("mark_attendance", { p_student_id: studentId })
    .single();

  if (error) {
    throw new Error(`No se pudo registrar asistencia: ${error.message}`);
  }

  revalidatePath("/");

  return data;
}
