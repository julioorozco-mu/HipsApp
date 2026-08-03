import { createPlaylist } from "@/app/actions/playlists";
import { PlaylistForm } from "@/components/features/playlists/playlist-form";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewPlaylistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  return (
    <PlaylistShell backHref="/playlists" title="Nueva playlist">
      <PlaylistForm action={createPlaylist} submitLabel="Crear playlist" />
    </PlaylistShell>
  );
}
