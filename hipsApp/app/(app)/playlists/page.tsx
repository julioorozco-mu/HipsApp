import Link from "next/link";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { SpotifyMark } from "@/components/features/playlists/spotify-mark";
import { createClient } from "@/lib/supabase/server";

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [connectionResult, playlistsResult] = await Promise.all([
    supabase
      .from("spotify_connections")
      .select("display_name, spotify_user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("playlists")
      .select("id, name, sync_status, spotify_playlist_id, playlist_tracks(count)")
      .eq("active", true)
      .eq("spotify_owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);
  if (connectionResult.error || playlistsResult.error) {
    throw new Error(connectionResult.error?.message ?? playlistsResult.error?.message);
  }
  const connection = connectionResult.data;

  return (
    <PlaylistShell backHref="/mas" title="Playlists">
      <Link
        href={connection ? "/playlists/importar" : "/playlists/conectar"}
        className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#14a44d]/30 bg-[#1ed760]/10 p-4 transition-colors hover:bg-[#1ed760]/15"
      >
        <SpotifyMark className="size-12 text-lg" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#087c3b]">
            {connection ? "Spotify conectado" : "Conecta Spotify"}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {connection?.display_name ?? "Importa y sincroniza tus playlists"}
          </span>
        </span>
        <RefreshCw className="size-5 text-[#087c3b]" />
      </Link>

      <div className="mt-4 flex gap-2">
        <Link href="/playlists/importar" className="min-h-11 flex-1 rounded-xl border px-3 py-2 text-center text-sm font-semibold hover:bg-secondary">
          Importar
        </Link>
        <Link href="/playlists/nueva" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" /> Nueva playlist
        </Link>
      </div>

      <div className="mt-5 grid gap-3">
        {playlistsResult.data.map((playlist) => {
          const count = playlist.playlist_tracks[0]?.count ?? 0;
          return (
            <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="flex min-h-20 items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-secondary">
              <PlaylistArtwork name={playlist.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{playlist.name}</span>
                <span className="block text-sm text-muted-foreground">{count} canciones</span>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${playlist.sync_status === "sincronizada" ? "bg-[#1ed760]/15 text-[#087c3b]" : "bg-amber-100 text-amber-800"}`}>
                  {playlist.sync_status === "sincronizada" ? "Sincronizada" : "Cambios pendientes"}
                </span>
              </span>
              <ChevronRight className="size-5" />
            </Link>
          );
        })}
        {!playlistsResult.data.length ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-semibold">Aún no tienes playlists</p>
            <p className="mt-1 text-sm text-muted-foreground">Importa las que ya usas en Spotify o crea una nueva.</p>
          </div>
        ) : null}
      </div>
    </PlaylistShell>
  );
}
