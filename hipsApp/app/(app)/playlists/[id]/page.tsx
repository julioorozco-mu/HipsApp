import Link from "next/link";
import { ExternalLink, Pencil, RefreshCw } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { refreshPlaylistFromSpotify } from "@/app/actions/playlists";
import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { SpotifyMark } from "@/components/features/playlists/spotify-mark";
import { createClient } from "@/lib/supabase/server";

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const [{ data: playlist }, { data: tracks, error }] = await Promise.all([
    supabase.from("playlists").select("*").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle(),
    supabase.from("playlist_tracks").select("id, title, artist, duration_seconds, external_url").eq("playlist_id", id).order("position"),
  ]);
  if (error) throw new Error(error.message);
  if (!playlist) notFound();
  const totalSeconds = (tracks ?? []).reduce((sum, track) => sum + (track.duration_seconds ?? 0), 0);
  const refreshAction = refreshPlaylistFromSpotify.bind(null, id);

  return (
    <PlaylistShell backHref="/playlists" menu title="Detalle de playlist">
      <div className="flex items-center gap-4">
        <PlaylistArtwork name={playlist.name} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold">{playlist.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tracks?.length ?? 0} canciones · {duration(totalSeconds)}</p>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${playlist.sync_status === "sincronizada" ? "bg-[#1ed760]/15 text-[#087c3b]" : "bg-amber-100 text-amber-800"}`}>{playlist.sync_status === "sincronizada" ? "Sincronizada" : "Cambios pendientes"}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {playlist.external_url ? <a href={playlist.external_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#14a44d] text-sm font-semibold text-[#087c3b]"><SpotifyMark className="size-5" /> Abrir en Spotify <ExternalLink className="size-4" /></a> : <span />}
        <form action={refreshAction}><button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary text-sm font-semibold text-primary"><RefreshCw className="size-4" /> Sincronizar ahora</button></form>
      </div>

      <div className="mt-5 divide-y overflow-hidden rounded-2xl border">
        {(tracks ?? []).map((track) => (
          <div key={track.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground">♫</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{track.title}</span><span className="block truncate text-xs text-muted-foreground">{track.artist ?? "Artista desconocido"}</span></span>
            <span className="text-xs text-muted-foreground">{track.duration_seconds ? `${Math.floor(track.duration_seconds / 60)}:${String(track.duration_seconds % 60).padStart(2, "0")}` : "—"}</span>
          </div>
        ))}
        {!tracks?.length ? <p className="p-6 text-center text-sm text-muted-foreground">Esta playlist aún no tiene canciones.</p> : null}
      </div>

      <Link href={`/playlists/${id}/editar`} className="mt-auto flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Pencil className="size-5" /> Editar playlist</Link>
    </PlaylistShell>
  );
}
