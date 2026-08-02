"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Minus, Plus, Search } from "lucide-react";

import type { PlaylistActionState } from "@/app/actions/playlists";
import type { SpotifyTrack } from "@/lib/spotify/types";

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TrackManager({
  action,
  initialTracks,
}: {
  action: (state: PlaylistActionState, formData: FormData) => Promise<PlaylistActionState>;
  initialTracks: SpotifyTrack[];
}) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>(initialTracks);
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(action, { error: null });

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
      const data = (await response.json()) as { error?: string; tracks: SpotifyTrack[] };
      if (!response.ok) throw new Error(data.error ?? "No se pudo buscar.");
      setResults(data.tracks);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "No se pudo buscar.");
    } finally {
      setSearching(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tracks.length) return;
    setTracks((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <form onSubmit={search} className="flex gap-2">
        <label className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en Spotify"
            className="min-h-12 w-full rounded-xl border bg-card pr-3 pl-10 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
          />
        </label>
        <button type="submit" className="min-h-12 rounded-xl bg-[#14a44d] px-4 font-semibold text-white">
          {searching ? <LoaderCircle className="size-5 animate-spin" /> : "Buscar"}
        </button>
      </form>
      {searchError ? <p role="alert" className="mt-2 text-sm text-destructive">{searchError}</p> : null}

      {results.length ? (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">Agregar canciones</h2>
          <div className="grid gap-1">
            {results.map((track) => {
              const added = tracks.some((item) => item.spotifyUri === track.spotifyUri);
              return (
                <div key={track.spotifyUri} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{track.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{duration(track.durationSeconds)}</span>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => setTracks((current) => [...current, track])}
                    aria-label={`Agregar ${track.title}`}
                    className="grid size-9 place-items-center rounded-full border border-[#14a44d] text-[#14a44d] disabled:opacity-35"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">En la playlist · {tracks.length}</h2>
        <div className="grid gap-1">
          {tracks.map((track, index) => (
            <div key={`${track.spotifyUri}-${index}`} className="flex items-center gap-2 rounded-xl border px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{track.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{track.artist}</span>
              </span>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir canción" className="grid size-8 place-items-center disabled:opacity-25"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === tracks.length - 1} aria-label="Bajar canción" className="grid size-8 place-items-center disabled:opacity-25"><ArrowDown className="size-4" /></button>
              <button type="button" onClick={() => setTracks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${track.title}`} className="grid size-8 place-items-center text-destructive"><Minus className="size-5" /></button>
            </div>
          ))}
          {!tracks.length ? (
            <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Busca canciones para comenzar.</p>
          ) : null}
        </div>
      </section>

      <form action={formAction} className="mt-auto pt-5">
        <input type="hidden" name="tracks" value={JSON.stringify(tracks)} />
        {state.error ? <p role="alert" className="mb-3 text-sm text-destructive">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="min-h-13 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? "Actualizando…" : "Actualizar playlist"}
        </button>
      </form>
    </div>
  );
}
