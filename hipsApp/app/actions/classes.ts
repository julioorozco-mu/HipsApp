"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FinishClassState = {
  className?: string;
  error: string | null;
  finishedAt?: string;
  notes?: string | null;
  playlistName?: string;
  presentCount?: number;
  shareText?: string;
  shareUrl?: string;
  success: boolean;
};

function validWebUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function finishError(message: string) {
  if (message.includes("attendance must be saved")) {
    return "Guarda la asistencia antes de finalizar la clase.";
  }
  if (message.includes("class has not started")) {
    return "La clase todavía no inicia y no puede finalizarse.";
  }
  if (message.includes("class session not found")) {
    return "No encontramos la sesión seleccionada.";
  }
  if (message.includes("closing notes too long")) {
    return "Las notas de cierre no pueden superar 500 caracteres.";
  }
  if (message.includes("operational role required")) {
    return "Tu cuenta no tiene permiso para finalizar clases.";
  }
  return `No se pudo finalizar la clase: ${message}`;
}

export async function finishClass(
  _state: FinishClassState,
  formData: FormData
): Promise<FinishClassState> {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const playlistId = String(formData.get("playlistId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const sendPlaylist = formData.get("sendPlaylist") === "on";

  if (!sessionId) {
    return { error: "No se pudo validar la clase.", success: false };
  }
  if (notes.length > 500) {
    return {
      error: "Las notas de cierre no pueden superar 500 caracteres.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para finalizar la clase.", success: false };
  }

  const { data: session, error: sessionError } = await supabase
    .from("session_overview")
    .select(
      "id, class_id, class_name, starts_at, status, attendance_saved_at, playlist_url, present_count"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session?.id) {
    return {
      error: sessionError
        ? `No se pudo cargar la clase: ${sessionError.message}`
        : "No encontramos la sesión seleccionada.",
      success: false,
    };
  }
  if (!session.attendance_saved_at) {
    return { error: "Guarda la asistencia antes de finalizar la clase.", success: false };
  }
  if (session.starts_at && new Date() < new Date(session.starts_at)) {
    return { error: "La clase todavía no inicia y no puede finalizarse.", success: false };
  }

  let playlistName = "Playlist de la clase";
  let playlistUrl = session.playlist_url?.trim() ?? "";

  if (playlistId) {
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id, name, external_url")
      .eq("id", playlistId)
      .eq("active", true)
      .maybeSingle();

    if (playlistError) {
      return {
        error: `No se pudo cargar la playlist: ${playlistError.message}`,
        success: false,
      };
    }
    if (!playlist) {
      return { error: "Selecciona una playlist activa.", success: false };
    }

    playlistName = playlist.name;
    playlistUrl = playlist.external_url?.trim() ?? "";
  }

  if (playlistUrl && !validWebUrl(playlistUrl)) {
    return { error: "El enlace de la playlist no es válido.", success: false };
  }
  if (sendPlaylist && !playlistUrl) {
    return {
      error: "Sincroniza la playlist con Spotify antes de compartirla por WhatsApp.",
      success: false,
    };
  }

  const { error: finishClassError } = await supabase.rpc(
    "finish_class_session" as never,
    {
      p_notes: notes || null,
      p_playlist_url: playlistUrl || null,
      p_session_id: sessionId,
    } as never
  );

  if (finishClassError) {
    return { error: finishError(finishClassError.message), success: false };
  }

  const { data: completedSession, error: completedError } = await supabase
    .from("class_sessions")
    .select("finished_at, notes")
    .eq("id", sessionId)
    .maybeSingle();

  if (completedError) {
    return {
      error: `La clase se cerró, pero no pudimos cargar el resumen: ${completedError.message}`,
      success: false,
    };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/asistencia/finalizar");
  revalidatePath("/mensajes");

  const className = session.class_name ?? "la clase";
  return {
    className,
    error: null,
    finishedAt: completedSession?.finished_at ?? new Date().toISOString(),
    notes: completedSession?.notes ?? null,
    playlistName,
    presentCount: Number(session.present_count ?? 0),
    success: true,
    ...(sendPlaylist && playlistUrl
      ? {
          shareText: `Gracias por asistir a ${className}. Aquí está ${playlistName}, la playlist de hoy:`,
          shareUrl: playlistUrl,
        }
      : {}),
  };
}
