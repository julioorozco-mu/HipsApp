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

export type ManualCloseClassResult = {
  error: string | null;
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

function manualCloseError(message: string) {
  if (message.includes("manual close reason required")) {
    return "Selecciona o escribe el motivo del cierre.";
  }
  if (message.includes("manual close reason too long")) {
    return "El motivo no puede superar 300 caracteres.";
  }
  if (message.includes("operational role required")) {
    return "Solo Superadmin y Administradores pueden cerrar una clase manualmente.";
  }
  if (message.includes("class session not found")) {
    return "No encontramos la sesión seleccionada.";
  }
  if (message.includes("class session is closed")) {
    return "Esta clase ya está cerrada.";
  }
  return `No se pudo cerrar la clase: ${message}`;
}

export async function closeClassManually(
  sessionId: string,
  reason: string
): Promise<ManualCloseClassResult> {
  const normalizedReason = reason.trim();

  if (!sessionId) {
    return { error: "No se pudo validar la clase.", success: false };
  }
  if (normalizedReason.length < 5) {
    return { error: "Selecciona o escribe el motivo del cierre.", success: false };
  }
  if (normalizedReason.length > 300) {
    return { error: "El motivo no puede superar 300 caracteres.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para cerrar la clase.", success: false };
  }

  const { error } = await supabase.rpc(
    "close_class_session_manually" as never,
    {
      p_reason: normalizedReason,
      p_session_id: sessionId,
    } as never
  );

  if (error) {
    return { error: manualCloseError(error.message), success: false };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/asistencia/finalizar");

  return { error: null, success: true };
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
