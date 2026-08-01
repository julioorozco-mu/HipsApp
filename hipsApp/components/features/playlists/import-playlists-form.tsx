"use client";

import { useActionState, useState } from "react";

import { importSpotifyPlaylists } from "@/app/actions/playlists";
import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import type { SpotifyPlaylistSummary } from "@/lib/spotify/types";

export function ImportPlaylistsForm({ playlists }: { playlists: SpotifyPlaylistSummary[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, action, pending] = useActionState(importSpotifyPlaylists, { error: null });
  const [query, setQuery] = useState("");
  const visible = playlists.filter((playlist) =>
    playlist.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))
  );

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar playlists en Spotify"
        className="min-h-12 rounded-xl border bg-card px-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
      />
      <div className="mt-4 grid gap-2">
        {visible.map((playlist) => (
          <label key={playlist.id} className="flex min-h-17 items-center gap-3 rounded-2xl border px-3 py-2 hover:bg-secondary">
            <PlaylistArtwork name={playlist.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{playlist.name}</span>
              <span className="text-sm text-muted-foreground">{playlist.totalItems} canciones</span>
            </span>
            <input
              type="checkbox"
              name="playlistIds"
              value={playlist.id}
              checked={selected.includes(playlist.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, playlist.id]
                    : current.filter((id) => id !== playlist.id)
                )
              }
              className="size-6 accent-primary"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {selected.length} seleccionada{selected.length === 1 ? "" : "s"}
      </p>
      {state.error ? <p role="alert" className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      <button
        type="submit"
        disabled={!selected.length || pending}
        className="mt-auto min-h-13 rounded-xl bg-[#14a44d] px-4 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Importando…" : "Importar seleccionadas"}
      </button>
    </form>
  );
}
