import Link from "next/link";
import { Check, Music2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { PlaylistArtwork } from "@/components/features/playlists/playlist-artwork";
import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { createClient } from "@/lib/supabase/server";

export default async function PlaylistCreatedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data: playlist } = await supabase.from("playlists").select("id, name").eq("id", id).eq("spotify_owner_id", user.id).maybeSingle();
  if (!playlist) notFound();

  return (
    <PlaylistShell backHref="/playlists" title="Playlist creada">
      <div className="mx-auto mt-4 grid size-20 place-items-center rounded-full border-2 border-[#14a44d] bg-[#1ed760]/10 text-[#14a44d]"><Check className="size-10" strokeWidth={3} /></div>
      <h2 className="mt-6 text-center text-2xl font-bold">{playlist.name} ya está sincronizada con Spotify.</h2>
      <div className="mx-auto mt-7 text-center">
        <PlaylistArtwork name={playlist.name} size="lg" />
        <p className="mt-3 text-lg font-bold">{playlist.name}</p>
        <p className="mt-1 inline-flex rounded-full bg-[#1ed760]/15 px-3 py-1 text-sm font-medium text-[#087c3b]">Sincronizada</p>
      </div>
      <div className="mt-auto grid gap-3 pt-8">
        <Link href={`/playlists/${playlist.id}/canciones`} className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Music2 className="size-5" /> Agregar canciones</Link>
        <Link href={`/playlists/${playlist.id}`} className="flex min-h-13 items-center justify-center rounded-xl border border-primary px-4 font-semibold text-primary">Ver playlist</Link>
      </div>
    </PlaylistShell>
  );
}
