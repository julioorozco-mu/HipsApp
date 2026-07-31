import Link from "next/link";
import {
  ArrowLeft,
  Grip,
  MoreHorizontal,
  Music2,
  Play,
  UsersRound,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { FinishClassForm } from "@/components/features/attendance/finish-class-form";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
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
            "id, class_id, class_name, present_count, absent_count, playlist_url, attendance_saved_at, status"
          )
          .eq("id", requestedSession)
          .maybeSingle()
      : await supabase
          .from("session_overview")
          .select(
            "id, class_id, class_name, present_count, absent_count, playlist_url, attendance_saved_at, status"
          )
          .in("status", ["programada", "en_curso"])
          .order("starts_at")
          .limit(1)
          .maybeSingle();

  if (sessionResult.error) {
    throw new Error(
      `No se pudo cargar la clase: ${sessionResult.error.message}`
    );
  }

  const session = sessionResult.data;
  const { data: classData, error: classError } =
    user && session?.class_id
      ? await supabase
          .from("classes")
          .select("playlist_id")
          .eq("id", session.class_id)
          .maybeSingle()
      : { data: null, error: null };

  if (classError) {
    throw new Error(`No se pudo cargar la playlist: ${classError.message}`);
  }

  const playlistId = classData?.playlist_id;
  const [playlistResult, tracksResult] =
    user && playlistId
      ? await Promise.all([
          supabase
            .from("playlists")
            .select("name, external_url")
            .eq("id", playlistId)
            .maybeSingle(),
          supabase
            .from("playlist_tracks")
            .select(
              "id, title, artist, bpm, genre, duration_seconds, position, external_url"
            )
            .eq("playlist_id", playlistId)
            .order("position"),
        ])
      : [
          { data: null, error: null },
          { data: [], error: null },
        ];

  if (playlistResult.error || tracksResult.error) {
    throw new Error(
      `No se pudo cargar la playlist: ${
        playlistResult.error?.message ?? tracksResult.error?.message
      }`
    );
  }

  const tracks = tracksResult.data ?? [];
  const playlistUrl = session?.playlist_url ?? playlistResult.data?.external_url;
  const present = Number(session?.present_count ?? 0);
  const absent = Number(session?.absent_count ?? 0);

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
              <h2 className="mt-3 text-xl font-semibold">
                No hay una clase por finalizar
              </h2>
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
          ) : (
            <>
              <section className="mt-6 flex min-h-28 items-center gap-4 rounded-3xl bg-[oklch(0.91_0.09_155)] px-5 py-4">
                <UsersRound
                  className="size-10 shrink-0"
                  fill="currentColor"
                  strokeWidth={1.5}
                />
                <div>
                  <h2 className="text-[1.15rem] font-bold tracking-tight whitespace-nowrap sm:text-2xl">
                    {present} presentes · {absent} ausentes
                  </h2>
                  <p className="mt-1 text-base text-foreground/70">
                    {present + absent} alumnos registrados
                  </p>
                </div>
              </section>

              <section className="mt-7" aria-labelledby="playlist-title">
                <h2
                  id="playlist-title"
                  className="text-2xl font-semibold tracking-[-0.03em]"
                >
                  Playlist de hoy
                </h2>
                {tracks.length ? (
                  <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                    {tracks.map((track, index) => {
                      const Icon = index % 2 ? Play : Music2;
                      return (
                        <li
                          key={track.id}
                          className="grid min-h-20 grid-cols-[3.25rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
                        >
                          <span
                            className={`grid size-12 place-items-center rounded-xl text-white ${
                              index % 2
                                ? "bg-[oklch(0.58_0.24_25)]"
                                : "bg-[oklch(0.22_0.02_300)]"
                            }`}
                          >
                            <Icon className="size-6" fill="currentColor" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-base font-semibold">
                              {track.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[
                                track.artist,
                                track.bpm ? `${track.bpm} BPM` : null,
                                track.genre,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {duration(track.duration_seconds)}
                          </span>
                          <Grip className="size-5 text-muted-foreground" />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-2xl border border-dashed border-border px-5 py-7 text-center text-sm text-muted-foreground">
                    Esta clase todavía no tiene canciones.
                  </p>
                )}
              </section>

              <FinishClassForm
                playlistUrl={playlistUrl ?? null}
                sessionId={session.id}
              />
            </>
          )}
        </div>

        <AppNav active="/asistencia" />
      </div>
    </main>
  );
}
