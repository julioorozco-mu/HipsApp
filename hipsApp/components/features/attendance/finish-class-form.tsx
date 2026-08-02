"use client";

import {
  AlertCircle,
  ExternalLink,
  Grip,
  Music2,
  Play,
  Send,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  finishClass,
  type FinishClassState,
} from "@/app/actions/classes";
import { Button } from "@/components/ui/button";

export type FinishPlaylistTrack = {
  artist: string | null;
  durationSeconds: number | null;
  id: string;
  title: string;
};

export type FinishPlaylistOption = {
  externalUrl: string | null;
  id: string;
  name: string;
  totalSeconds: number;
  tracks: FinishPlaylistTrack[];
};

const initialState: FinishClassState = { error: null, success: false };

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function totalDuration(seconds: number) {
  if (!seconds) return "0 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} h${remaining ? ` ${remaining} min` : ""}`;
}

export function FinishClassForm({
  defaultPlaylistId,
  playlists,
  presentCount,
  sessionId,
}: {
  defaultPlaylistId: string | null;
  playlists: FinishPlaylistOption[];
  presentCount: number;
  sessionId: string;
}) {
  const [selectedId, setSelectedId] = useState(defaultPlaylistId ?? "");
  const [sendPlaylist, setSendPlaylist] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const selected = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedId) ?? null,
    [playlists, selectedId]
  );
  const canShare = Boolean(selected?.externalUrl && presentCount > 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError("");
      const result = await finishClass(initialState, formData);
      if (!result.success) {
        setError(result.error ?? "No se pudo finalizar la clase.");
        return;
      }

      if (result.shareUrl) {
        const text = `${result.shareText ?? "Playlist de la clase"} ${result.shareUrl}`;
        try {
          if (navigator.share) {
            await navigator.share({
              title: selected?.name ?? "Playlist de la clase",
              text: result.shareText,
              url: result.shareUrl,
            });
          } else {
            window.location.assign(`https://wa.me/?text=${encodeURIComponent(text)}`);
            return;
          }
        } catch (shareError) {
          if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
            window.location.assign(`https://wa.me/?text=${encodeURIComponent(text)}`);
            return;
          }
        }
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="playlistId" type="hidden" value={selectedId} />

      <section aria-labelledby="playlist-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="playlist-title" className="text-2xl font-semibold tracking-[-0.03em]">
              Playlist de hoy
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La asignada a la clase aparece seleccionada. El cambio solo aplica hoy.
            </p>
          </div>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-semibold">
          Seleccionar playlist
          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setSendPlaylist(false);
            }}
            className="min-h-12 w-full rounded-xl border bg-card px-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
          >
            <option value="">Sin playlist para esta sesión</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name} · {playlist.tracks.length} canciones
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-3 border-b bg-secondary/35 px-4 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Music2 className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{selected.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {selected.tracks.length} canciones · {totalDuration(selected.totalSeconds)}
                </span>
              </span>
              {selected.externalUrl ? (
                <a
                  href={selected.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir playlist en Spotify"
                  className="grid size-10 shrink-0 place-items-center rounded-full border text-[oklch(0.48_0.17_145)] transition-colors hover:bg-[oklch(0.95_0.05_145)]"
                >
                  <ExternalLink className="size-5" />
                </a>
              ) : null}
            </div>

            {selected.tracks.length ? (
              <ul className="max-h-72 divide-y overflow-y-auto overscroll-contain">
                {selected.tracks.map((track, index) => {
                  const Icon = index % 2 ? Play : Music2;
                  return (
                    <li
                      key={track.id}
                      className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
                    >
                      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" fill={index % 2 ? "currentColor" : "none"} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{track.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artist || "Artista no disponible"}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {duration(track.durationSeconds)}
                      </span>
                      <Grip className="size-4 text-muted-foreground" />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-7 text-center text-sm text-muted-foreground">
                Esta playlist todavía no tiene canciones.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed px-5 py-8 text-center">
            <Music2 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 font-semibold">Sin playlist asignada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Puedes finalizar sin música o seleccionar una playlist para esta sesión.
            </p>
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="playlist-link-title">
        <h2 id="playlist-link-title" className="text-xl font-semibold tracking-[-0.025em]">
          Enlace de playlist
        </h2>
        <div className="mt-2 flex min-h-14 items-center gap-3 rounded-xl border px-4">
          <Send className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {selected?.externalUrl ? (
            <a
              href={selected.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
            >
              {selected.externalUrl}
            </a>
          ) : (
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {selected
                ? "Sincroniza esta playlist con Spotify para obtener el enlace."
                : "Selecciona una playlist para mostrar su enlace."}
            </p>
          )}
        </div>
      </section>

      <label
        className={`mt-5 flex min-h-20 items-center gap-3 rounded-2xl border px-4 ${
          canShare ? "cursor-pointer" : "cursor-not-allowed bg-secondary/35 opacity-65"
        }`}
      >
        <Share2 className="size-6 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">
            Compartir por WhatsApp al finalizar
          </span>
          <span className="block text-xs text-muted-foreground">
            Abriremos el menú nativo para elegir el grupo de WhatsApp.
          </span>
        </span>
        <span className="relative inline-flex h-8 w-14 shrink-0">
          <input
            type="checkbox"
            name="sendPlaylist"
            checked={sendPlaylist}
            disabled={!canShare}
            onChange={(event) => setSendPlaylist(event.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-[oklch(0.69_0.16_155)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
          <span className="absolute top-1 left-1 size-6 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-6" />
        </span>
      </label>

      {!selected?.externalUrl && selected ? (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-[oklch(0.97_0.04_80)] px-3 py-2 text-xs text-[oklch(0.48_0.12_65)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          La clase puede finalizar, pero no podrá compartirse hasta sincronizar la playlist con Spotify.
        </p>
      ) : null}

      {error ? (
        <p aria-live="polite" className="mt-4 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-14 w-full rounded-xl text-base font-semibold"
      >
        {pending ? "Finalizando..." : "Finalizar clase"}
      </Button>
    </form>
  );
}
