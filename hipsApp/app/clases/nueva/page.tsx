import { redirect } from "next/navigation";

import { createClass } from "@/app/actions/more";
import {
  ClassForm,
  type ClassPlaylistOption,
} from "@/components/features/more/class-form";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function NewClassPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data: playlistRows, error: playlistError }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("playlists")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ]);

  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");
  if (playlistError) throw new Error(`No se pudieron cargar las playlists: ${playlistError.message}`);

  const playlistIds = (playlistRows ?? []).map((playlist) => playlist.id);
  const { data: trackRows, error: trackError } = playlistIds.length
    ? await supabase
        .from("playlist_tracks")
        .select("playlist_id")
        .in("playlist_id", playlistIds)
    : { data: [], error: null };
  if (trackError) throw new Error(`No se pudieron contar las canciones: ${trackError.message}`);

  const counts = new Map<string, number>();
  for (const track of trackRows ?? []) {
    counts.set(track.playlist_id, (counts.get(track.playlist_id) ?? 0) + 1);
  }
  const playlists: ClassPlaylistOption[] = (playlistRows ?? []).map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackCount: counts.get(playlist.id) ?? 0,
  }));

  return (
    <MoreShell title="Nueva clase" backHref="/clases">
      <ClassForm
        action={createClass}
        playlists={playlists}
        submitLabel="Guardar clase"
      />
    </MoreShell>
  );
}
