import { notFound, redirect } from "next/navigation";

import { savePlaylistTracks } from "@/app/actions/playlists";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { TrackManager } from "@/components/features/playlists/track-manager";
import { createClient } from "@/lib/supabase/server";

export default async function ManageTracksPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const [{ data: playlist }, { data: tracks, error }] = await Promise.all([
    supabase.from("playlists").select("id").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle(),
    supabase.from("playlist_tracks").select("title, artist, album_name, duration_seconds, external_url, spotify_uri").eq("playlist_id", id).order("position"),
  ]);
  if (error) throw new Error(error.message);
  if (!playlist) notFound();
  const action = savePlaylistTracks.bind(null, id);

  return (
    <PlaylistShell backHref={`/playlists/${id}/editar`} title="Gestionar canciones">
      <TrackManager
        action={action}
        initialTracks={(tracks ?? []).flatMap((track) =>
          track.spotify_uri
            ? [{ albumName: track.album_name, artist: track.artist, durationSeconds: track.duration_seconds, externalUrl: track.external_url, spotifyUri: track.spotify_uri, title: track.title }]
            : []
        )}
      />
    </PlaylistShell>
  );
}
