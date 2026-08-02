import Link from "next/link";
import { ArrowDownUp, Info, ListMinus, ListPlus } from "lucide-react";
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

export default async function ReviewSyncPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const [{ data: playlist }, { data: localTracks, error }] = await Promise.all([
    supabase.from("playlists").select("id, name, description, is_public, spotify_playlist_id, sync_status").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle(),
    supabase.from("playlist_tracks").select("spotify_uri").eq("playlist_id", id).order("position"),
  ]);
  if (error) throw new Error(error.message);
  if (!playlist) notFound();
  const action = synchronizePlaylist.bind(null, id);
  let preview = {
    added: localTracks?.length ?? 0,
    detailsChanged: true,
    orderChanged: true,
    removed: 0,
  };
  if (playlist.spotify_playlist_id) {
    const client = await createSpotifyClient();
    const [remote, remoteTracks] = await Promise.all([
      getSpotifyPlaylist(playlist.spotify_playlist_id, client),
      getSpotifyPlaylistTracks(playlist.spotify_playlist_id, client),
    ]);
    preview = buildPlaylistSyncPreview(
      (localTracks ?? []).flatMap((track) => track.spotify_uri ? [track.spotify_uri] : []),
      remoteTracks.map((track) => track.spotifyUri),
      remote.name !== playlist.name ||
        remote.description !== playlist.description ||
        remote.isPublic !== playlist.is_public
    );
  }

  return (
    <PlaylistShell backHref={`/playlists/${id}/editar`} menu title="Revisar sincronización">
      <div className="flex items-center gap-4 rounded-2xl border bg-amber-50 p-4">
        <PlaylistArtwork name={playlist.name} size="sm" />
        <div className="min-w-0"><h2 className="truncate text-lg font-bold">{playlist.name}</h2><span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Cambios pendientes</span></div>
      </div>
      <div className="mt-5 divide-y overflow-hidden rounded-2xl border">
        <div className="flex min-h-14 items-center gap-3 px-4"><ListPlus className="size-5 text-[#14a44d]" /><span className="flex-1">Canciones agregadas</span><strong>{preview.added}</strong></div>
        <div className="flex min-h-14 items-center gap-3 px-4"><ListMinus className="size-5 text-destructive" /><span className="flex-1">Canciones eliminadas</span><strong>{preview.removed}</strong></div>
        <div className="flex min-h-14 items-center gap-3 px-4"><ArrowDownUp className="size-5 text-primary" /><span className="flex-1">Orden actualizado</span><strong>{preview.orderChanged ? "Sí" : "No"}</strong></div>
      </div>
      <p className="mt-5 flex gap-3 rounded-2xl border border-primary/35 bg-primary/5 p-4 text-sm"><Info className="size-5 shrink-0 text-primary" />Los cambios reemplazarán la versión actual de esta playlist en Spotify.</p>
      <div className="mt-auto grid gap-3 pt-6">
        <ActionButton action={action} className="bg-[#14a44d] text-white hover:bg-[#0f8e41]">Sincronizar con Spotify</ActionButton>
        <Link href={`/playlists/${id}/editar`} className="flex min-h-13 items-center justify-center rounded-xl border border-primary font-semibold text-primary">Volver a editar</Link>
      </div>
    </PlaylistShell>
  );
}
