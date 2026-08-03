import Link from "next/link";
import { ArrowLeft, CheckCircle2, MoreHorizontal, UsersRound } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import {
  FinishClassForm,
  type FinishPlaylistOption,
  type FinishPlaylistTrack,
} from "@/components/features/attendance/finish-class-form";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function FinishClassPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const requestedSession = (await searchParams).session;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionResult = !user
    ? { data: null, error: null }
    : requestedSession && uuidPattern.test(requestedSession)
      ? await supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, starts_at, present_count, attendance_saved_at, status"
          )
          .eq("id", requestedSession)
          .maybeSingle()
      : await supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, starts_at, present_count, attendance_saved_at, status"
          )
          .not("attendance_saved_at", "is", null)
          .in("status", ["programada", "en_curso"])
          .order("starts_at")
          .limit(1)
          .maybeSingle();

  if (sessionResult.error) {
    throw new Error(`No se pudo cargar la clase: ${sessionResult.error.message}`);
  }

  const session = sessionResult.data;
  const [{ data: classData, error: classError }, { data: playlistRows, error: playlistError }] =
    user && session?.class_id
      ? await Promise.all([
          supabase
            .from("classes")
            .select("playlist_id")
            .eq("id", session.class_id)
            .maybeSingle(),
          supabase
            .from("playlists")
            .select("id, name, external_url")
            .eq("active", true)
            .order("name"),
        ])
      : [
          { data: null, error: null },
          { data: [], error: null },
        ];

  if (classError || playlistError) {
    throw new Error(
      `No se pudieron cargar las playlists: ${classError?.message ?? playlistError?.message}`
    );
  }

  const playlistIds = (playlistRows ?? []).map((playlist) => playlist.id);
  const { data: trackRows, error: tracksError } = playlistIds.length
    ? await supabase
        .from("playlist_tracks")
        .select("id, playlist_id, title, artist, duration_seconds, position")
        .in("playlist_id", playlistIds)
        .order("position")
    : { data: [], error: null };

  if (tracksError) {
    throw new Error(`No se pudieron cargar las canciones: ${tracksError.message}`);
  }

  const tracksByPlaylist = new Map<string, FinishPlaylistTrack[]>();
  for (const track of trackRows ?? []) {
    const current = tracksByPlaylist.get(track.playlist_id) ?? [];
    current.push({
      artist: track.artist,
      durationSeconds: track.duration_seconds,
      id: track.id,
      title: track.title,
    });
    tracksByPlaylist.set(track.playlist_id, current);
  }

  const playlists: FinishPlaylistOption[] = (playlistRows ?? []).map((playlist) => {
    const tracks = tracksByPlaylist.get(playlist.id) ?? [];
    return {
      externalUrl: playlist.external_url,
      id: playlist.id,
      name: playlist.name,
      totalSeconds: tracks.reduce(
        (total, track) => total + (track.durationSeconds ?? 0),
        0
      ),
      tracks,
    };
  });
  const defaultPlaylistId = playlists.some(
    (playlist) => playlist.id === classData?.playlist_id
  )
    ? classData?.playlist_id ?? null
    : null;
  const present = Number(session?.present_count ?? 0);

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-6 pb-7 sm:px-8 sm:pt-10">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href="/asistencia"
              aria-label="Volver a asistencia"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" />
            </Link>
            <h1 className="text-center text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
              Finalizar clase
            </h1>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <MoreHorizontal className="size-7" />
            </button>
          </header>

          {!session?.id ? (
            <div className="mt-12 rounded-3xl bg-secondary px-6 py-10 text-center">
              <UsersRound className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-3 text-xl font-semibold">No hay una clase por finalizar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Guarda primero la asistencia de la clase actual.
              </p>
              <Link
                href="/asistencia"
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Ir a asistencia
              </Link>
            </div>
          ) : session.status === "completada" ? (
            <div className="mt-12 rounded-3xl bg-[oklch(0.94_0.07_145)] px-6 py-10 text-center text-[oklch(0.34_0.09_145)]">
              <CheckCircle2 className="mx-auto size-11" />
              <h2 className="mt-3 text-xl font-semibold">Clase finalizada</h2>
              <p className="mt-1 text-sm opacity-80">
                Esta sesión ya quedó cerrada correctamente.
              </p>
              <Link
                href="/asistencia"
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Volver a asistencia
              </Link>
            </div>
          ) : (
            <>
              <section className="mt-6 rounded-3xl bg-[oklch(0.91_0.09_155)] px-5 py-5">
                <div className="flex items-center gap-4">
                  <UsersRound
                    className="size-10 shrink-0"
                    fill="currentColor"
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold tracking-tight">
                      {session.class_name ?? "Clase"}
                    </h2>
                    <p className="mt-1 text-sm text-foreground/70">
                      {session.starts_at
                        ? capitalize(dateFormatter.format(new Date(session.starts_at)))
                        : "Horario no disponible"}
                    </p>
                    <p className="mt-2 font-semibold">
                      {present} {present === 1 ? "alumno presente" : "alumnos presentes"}
                    </p>
                  </div>
                </div>
              </section>

              <FinishClassForm
                defaultPlaylistId={defaultPlaylistId}
                playlists={playlists}
                presentCount={present}
                sessionId={session.id}
              />
            </>
          )}
        </div>

        <AppNav />
      </div>
    </main>
  );
}

