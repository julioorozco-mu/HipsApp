import Link from "next/link";
import { ArrowDownUp, ChevronDown, Info, ListMinus, ListPlus } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { synchronizePlaylist } from "@/app/actions/playlists";
import { ActionButton } from "@/components/features/playlists/action-button";
import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { createClient } from "@/lib/supabase/server";
import { buildPlaylistSyncPreview } from "@/lib/spotify-sync";
import {
  createSpotifyClient,
  getSpotifyPlaylist,
  getSpotifyPlaylistTracks,
} from "@/lib/spotify/server";

type PreviewTrack = {
  artist: string | null;
  key: string;
  spotifyUri: string;
  title: string;
};

function changedTracks(source: PreviewTrack[], comparison: PreviewTrack[]) {
  const remaining = new Map<string, number>();
  for (const track of comparison) {
    remaining.set(track.spotifyUri, (remaining.get(track.spotifyUri) ?? 0) + 1);
  }

  return source.filter((track) => {
    const count = remaining.get(track.spotifyUri) ?? 0;
    if (!count) return true;
    remaining.set(track.spotifyUri, count - 1);
    return false;
  });
}

function TrackList({ empty, tracks }: { empty: string; tracks: PreviewTrack[] }) {
  if (!tracks.length) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="divide-y border-t">
      {tracks.map((track) => (
        <li key={track.key} className="px-4 py-3">
          <p className="truncate text-sm font-medium">{track.title}</p>
          {track.artist ? (
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function ReviewSyncPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: playlist }, { data: localRows, error }] = await Promise.all([
    supabase
      .from("playlists")
      .select("id, name, description, is_public, spotify_playlist_id, sync_status")
      .eq("id", id)
      .eq("spotify_owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("playlist_tracks")
      .select("id, title, artist, spotify_uri")
      .eq("playlist_id", id)
      .order("position"),
  ]);
  if (error) throw new Error(error.message);
  if (!playlist) notFound();

  const action = synchronizePlaylist.bind(null, id);
  const localTracks: PreviewTrack[] = (localRows ?? []).flatMap((track) =>
    track.spotify_uri
      ? [{ artist: track.artist, key: track.id, spotifyUri: track.spotify_uri, title: track.title }]
      : []
  );
  let remoteTracks: PreviewTrack[] = [];
  let preview = {
    added: localTracks.length,
    detailsChanged: true,
    orderChanged: localTracks.length > 0,
    removed: 0,
  };

  if (playlist.spotify_playlist_id) {
    const client = await createSpotifyClient();
    const [remote, spotifyTracks] = await Promise.all([
      getSpotifyPlaylist(playlist.spotify_playlist_id, client),
      getSpotifyPlaylistTracks(playlist.spotify_playlist_id, client),
    ]);
    remoteTracks = spotifyTracks.map((track) => ({
      artist: track.artist,
      key: crypto.randomUUID(),
      spotifyUri: track.spotifyUri,
      title: track.title,
    }));
    preview = buildPlaylistSyncPreview(
      localTracks.map((track) => track.spotifyUri),
      remoteTracks.map((track) => track.spotifyUri),
      remote.name !== playlist.name ||
        remote.description !== playlist.description ||
        remote.isPublic !== playlist.is_public
    );
  }

  const addedTracks = changedTracks(localTracks, remoteTracks);
  const removedTracks = changedTracks(remoteTracks, localTracks);

  return (
    <PlaylistShell backHref={`/playlists/${id}/editar`} menu title="Revisar sincronización">
      <div className="flex items-center gap-4 rounded-2xl border bg-amber-50 p-4">
        <PlaylistArtwork name={playlist.name} size="sm" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{playlist.name}</h2>
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
            Cambios pendientes
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border">
        <details className="group border-b">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <ListPlus className="size-5 text-[#14a44d]" />
            <span className="flex-1">Canciones agregadas</span>
            <strong>{preview.added}</strong>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <TrackList empty="No se agregarán canciones." tracks={addedTracks} />
        </details>

        <details className="group border-b">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <ListMinus className="size-5 text-destructive" />
            <span className="flex-1">Canciones eliminadas</span>
            <strong>{preview.removed}</strong>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <TrackList empty="No se eliminarán canciones." tracks={removedTracks} />
        </details>

        <div className="flex min-h-14 items-center gap-3 px-4">
          <ArrowDownUp className="size-5 text-primary" />
          <span className="flex-1">Orden actualizado</span>
          <strong>{preview.orderChanged ? "Sí" : "No"}</strong>
        </div>
      </div>

      <p className="mt-5 flex gap-3 rounded-2xl border border-primary/35 bg-primary/5 p-4 text-sm">
        <Info className="size-5 shrink-0 text-primary" />
        Los cambios reemplazarán la versión actual de esta playlist en Spotify.
      </p>

      <div className="mt-auto grid gap-3 pt-6">
        <ActionButton action={action} className="bg-[#14a44d] text-white hover:bg-[#0f8e41]">
          Sincronizar con Spotify
        </ActionButton>
        <Link
          href={`/playlists/${id}/editar`}
          className="flex min-h-13 items-center justify-center rounded-xl border border-primary font-semibold text-primary"
        >
          Volver a editar
        </Link>
      </div>
    </PlaylistShell>
  );
}
