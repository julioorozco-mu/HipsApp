import { notFound, redirect } from "next/navigation";

import { updateClass } from "@/app/actions/more";
import {
  ClassForm,
  type ClassPlaylistOption,
} from "@/components/features/more/class-form";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

function endTime(start: string, duration: number) {
  const [hour, minute] = start.slice(0, 5).split(":").map(Number);
  const total = hour * 60 + minute + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type ClassRow = {
  capacity?: number;
  duration_minutes: number;
  id: string;
  name: string;
  playlist_id: string | null;
  start_time: string;
  weekday: number;
};

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data }, { data: playlistRows, error: playlistError }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase.from("classes").select("*").eq("id", id).eq("active", true).maybeSingle(),
      supabase
        .from("playlists")
        .select("id, name")
        .eq("active", true)
        .order("name"),
    ]);
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");
  if (!data) notFound();
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

  const item = data as ClassRow;
  const action = updateClass.bind(null, id);

  return (
    <MoreShell title="Editar clase" backHref="/clases">
      <ClassForm
        action={action}
        defaultCapacity={item.capacity ?? 25}
        defaultIntervals={[
          {
            start: item.start_time.slice(0, 5),
            end: endTime(item.start_time, item.duration_minutes),
          },
        ]}
        defaultName={item.name}
        defaultPlaylistId={item.playlist_id}
        defaultWeekdays={[item.weekday]}
        multipleIntervals={false}
        multipleWeekdays={false}
        playlists={playlists}
        submitLabel="Guardar cambios"
      />
    </MoreShell>
  );
}
