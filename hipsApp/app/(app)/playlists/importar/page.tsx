import { redirect } from "next/navigation";

import { ImportPlaylistsForm } from "@/components/features/playlists/import-playlists-form";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { SpotifyMark } from "@/components/features/playlists/spotify-mark";
import { getSpotifyPlaylists } from "@/lib/spotify/server";
import { createClient } from "@/lib/supabase/server";

export default async function ImportSpotifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data: connection } = await supabase.from("spotify_connections").select("display_name").eq("user_id", user.id).maybeSingle();
  if (!connection) redirect("/playlists/conectar");
  const playlists = await getSpotifyPlaylists();

  return (
    <PlaylistShell backHref="/playlists" title="Importar desde Spotify">
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#1ed760]/10 px-3 py-2 text-sm">
        <SpotifyMark className="size-7" />
        <span className="min-w-0 truncate"><strong>{connection.display_name ?? "Spotify"}</strong> · Cuenta conectada</span>
      </div>
      <ImportPlaylistsForm playlists={playlists} />
    </PlaylistShell>
  );
}
