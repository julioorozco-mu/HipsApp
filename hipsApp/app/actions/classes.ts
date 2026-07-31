"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type FinishClassState = { error: string | null };

function validWebUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function finishClass(
  _state: FinishClassState,
  formData: FormData
): Promise<FinishClassState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const playlistUrl = String(formData.get("playlistUrl") ?? "").trim();
  const sendPlaylist = formData.get("sendPlaylist") === "on";

  if (!sessionId || (playlistUrl && !validWebUrl(playlistUrl))) {
    return { error: "No se pudo validar la clase o el enlace de la playlist." };
  }
  if (sendPlaylist && !playlistUrl) {
    return { error: "Configura el enlace de la playlist antes de enviarla." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Inicia sesión para finalizar la clase." };

  const { error: finishError } = await supabase.rpc("finish_class_session", {
    p_playlist_url: playlistUrl || undefined,
    p_session_id: sessionId,
  });

  if (finishError) {
    return { error: `No se pudo finalizar la clase: ${finishError.message}` };
  }

  if (sendPlaylist) {
    const [{ data: attendance }, { data: settings }] = await Promise.all([
      supabase
        .from("attendance")
        .select("student_id")
        .eq("session_id", sessionId),
      supabase
        .from("academy_settings")
        .select("whatsapp_min_delay_seconds, whatsapp_max_delay_seconds")
        .eq("id", true)
        .single(),
    ]);
    const studentIds = attendance?.map(({ student_id }) => student_id) ?? [];
    const { data: students } = studentIds.length
      ? await supabase
          .from("students")
          .select("id, telefono")
          .in("id", studentIds)
      : { data: [] };

    if (!students?.length) {
      return {
        error:
          "La clase terminó, pero no hay destinatarios para compartir la playlist.",
      };
    }

    const { data: batch, error: batchError } = await supabase
      .from("message_batches")
      .insert({
        created_by: user.id,
        max_delay_seconds: settings?.whatsapp_max_delay_seconds ?? 8,
        min_delay_seconds: settings?.whatsapp_min_delay_seconds ?? 3,
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (batchError) {
      return {
        error: `La clase terminó, pero no se pudo crear el envío: ${batchError.message}`,
      };
    }

    const { error: recipientsError } = await supabase
      .from("message_recipients")
      .insert(
        students.map((student) => ({
          batch_id: batch.id,
          phone: student.telefono,
          student_id: student.id,
        }))
      );

    if (recipientsError) {
      return {
        error: `La clase terminó, pero no se pudo completar la cola: ${recipientsError.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/asistencia/finalizar");
  revalidatePath("/mensajes");
  redirect("/");
}
