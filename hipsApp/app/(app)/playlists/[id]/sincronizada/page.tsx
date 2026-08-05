import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { SpotifyMark } from "@/components/features/playlists/spotify-mark";
import { createClient } from "@/lib/supabase/server";

const syncedFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export default async function SyncCompletedPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data: playlist } = await supabase.from("playlists").select("id, name, external_url, synced_at, playlist_tracks(count)").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle();
  if (!playlist) notFound();

  return (
    <PlaylistShell backHref={`/playlists/${id}`} menu title="Sincronización completada">
      <div className="mx-auto mt-3 grid size-20 place-items-center rounded-full border-2 border-[#14a44d] bg-[#1ed760]/10 text-[#14a44d]"><Check className="size-10" strokeWidth={3} /></div>
      <h2 className="mt-5 text-center text-2xl font-bold">Todo sincronizado</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">HipsApp y Spotify tienen la misma versión.</p>

      <div className="mt-7 flex items-center gap-4 rounded-2xl border p-4">
        <PlaylistArtwork name={playlist.name} />
        <div className="min-w-0"><h3 className="truncate text-lg font-bold">{playlist.name}</h3><p className="text-sm text-muted-foreground">{playlist.playlist_tracks[0]?.count ?? 0} canciones</p><p className="mt-1 text-xs text-muted-foreground">Última sincronización: {playlist.synced_at ? syncedFormatter.format(new Date(playlist.synced_at)) : "ahora"}</p><span className="mt-2 inline-flex rounded-full bg-[#1ed760]/15 px-2 py-1 text-xs text-[#087c3b]">Sincronizada</span></div>
      </div>

      <div className="mt-auto grid gap-3 pt-8">
        <Link href="/playlists" className="flex min-h-13 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">Volver a playlists</Link>
        {playlist.external_url ? <a href={playlist.external_url} target="_blank" rel="noreferrer" className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#14a44d] font-semibold text-[#087c3b]"><SpotifyMark className="size-6" /> Abrir en Spotify <ExternalLink className="size-4" /></a> : null}
      </div>
    </PlaylistShell>
  );
}
