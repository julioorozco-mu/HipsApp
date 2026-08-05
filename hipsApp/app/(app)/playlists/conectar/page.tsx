import Link from "next/link";
import { Link2, ListMusic, RefreshCw, ShieldCheck } from "lucide-react";

import { PlaylistShell } from "@/components/features/playlists/playlist-shell";
import { SpotifyMark } from "@/components/features/playlists/spotify-mark";
import { isSpotifyConfigured } from "@/lib/spotify/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConnectSpotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const [{ error }, supabase] = await Promise.all([searchParams, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const message = typeof error === "string" ? error : null;
  const configured = isSpotifyConfigured();

  return (
    <PlaylistShell backHref="/playlists" title="Conectar Spotify">
      <div className="mx-auto mt-3 grid size-24 place-items-center rounded-full bg-[#1ed760]">
        <SpotifyMark className="size-20 text-3xl" />
      </div>
      <h2 className="mt-5 text-center text-xl font-bold">Conecta tu cuenta de Spotify</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">Importa tus playlists y mantén los cambios sincronizados desde HipsApp.</p>

      <div className="mt-7 divide-y overflow-hidden rounded-2xl border">
        {[
          [ListMusic, "Ver e importar tus playlists"],
          [Link2, "Crear y editar playlists"],
          [RefreshCw, "Sincronizar canciones"],
        ].map(([Icon, label]) => (
          <div key={label as string} className="flex min-h-14 items-center gap-3 px-4">
            <Icon className="size-5 text-[#14a44d]" />
            <span className="text-sm font-medium">{label as string}</span>
          </div>
        ))}
      </div>

      {message ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p> : null}
      {!configured ? <p role="alert" className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">El administrador debe configurar las credenciales de Spotify en Vercel.</p> : null}

      <Link aria-disabled={!configured} href={configured ? "/api/spotify/connect" : "#"} className={`mt-auto flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#14a44d] px-4 font-semibold text-white ${configured ? "hover:bg-[#0f8e41]" : "pointer-events-none opacity-50"}`}>
        <SpotifyMark className="size-6" /> Conectar con Spotify
      </Link>
      <Link href="/playlists" className="mt-3 text-center text-sm font-semibold text-primary">Ahora no</Link>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4" /> HipsApp no almacena tu contraseña.</p>
    </PlaylistShell>
  );
}
