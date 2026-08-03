import { notFound, redirect } from "next/navigation";

import { archivePlaylist, updatePlaylist } from "@/app/actions/playlists";
import { PlaylistForm } from "@/components/features/playlists/playlist-form";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function EditPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data: playlist } = await supabase.from("playlists").select("name, description, is_public, use_at_class_end").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle();
  if (!playlist) notFound();
  const action = updatePlaylist.bind(null, id);
  const archiveAction = archivePlaylist.bind(null, id);

  return (
    <PlaylistShell backHref={`/playlists/${id}`} menu title="Editar playlist">
      <PlaylistForm action={action} submitLabel="Guardar y revisar" initial={{ description: playlist.description, isPublic: playlist.is_public, name: playlist.name, useAtClassEnd: playlist.use_at_class_end }} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href={`/playlists/${id}/canciones`} className="flex min-h-12 items-center justify-center rounded-xl border border-primary px-3 text-center text-sm font-semibold text-primary">Gestionar canciones</Link>
        <form action={archiveAction}><button type="submit" className="min-h-12 w-full rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">Quitar de HipsApp</button></form>
      </div>
    </PlaylistShell>
  );
}
