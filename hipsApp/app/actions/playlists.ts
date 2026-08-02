"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSpotifyClient,
  createSpotifyPlaylist,
  getSpotifyPlaylist,
  getSpotifyPlaylists,
  getSpotifyPlaylistTracks,
  replaceSpotifyPlaylistItems,
  SpotifyError,
  updateSpotifyPlaylist,
} from "@/lib/spotify/server";
import type { SpotifyPlaylistSummary, SpotifyTrack } from "@/lib/spotify/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database.types";

export type PlaylistActionState = { error: string | null };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const spotifyIdPattern = /^[A-Za-z0-9]{10,64}$/;
const spotifyTrackUriPattern = /^spotify:track:[A-Za-z0-9]+$/;

function actionError(error: unknown) {
  if (error instanceof SpotifyError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo completar la operación.";
}

function playlistFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || name.length > 100) {
    throw new Error("El nombre debe tener entre 1 y 100 caracteres.");
  }
  if (description.length > 300) {
    throw new Error("La descripción no puede superar 300 caracteres.");
  }
  return {
    description,
    isPublic: formData.get("visibility") === "public",
    name,
    useAtClassEnd: formData.get("useAtClassEnd") === "on",
  };
}

function databaseTracks(tracks: SpotifyTrack[]) {
  return tracks.map((track) => ({
    album_name: track.albumName,
    artist: track.artist,
    duration_seconds: track.durationSeconds,
    external_url: track.externalUrl,
    spotify_uri: track.spotifyUri,
    title: track.title,
  })) as Json;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para administrar playlists.");
  return { supabase, user };
}

async function saveImportedPlaylist(
  remote: SpotifyPlaylistSummary,
  tracks: SpotifyTrack[]
) {
  const { supabase, user } = await authenticatedClient();
  const { data: existing, error: findError } = await supabase
    .from("playlists")
    .select("id")
    .eq("spotify_playlist_id", remote.id)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  const values = {
    active: true,
    description: remote.description,
    external_url: remote.externalUrl,
    is_public: remote.isPublic,
    name: remote.name,
    spotify_owner_id: user.id,
    spotify_playlist_id: remote.id,
    spotify_snapshot_id: remote.snapshotId,
    sync_status: "sincronizada",
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await supabase
        .from("playlists")
        .update(values)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await supabase.from("playlists").insert(values).select("id").single();
  if (result.error) throw new Error(result.error.message);

  const { error: tracksError } = await supabase.rpc("save_playlist_tracks", {
    p_playlist_id: result.data.id,
    p_snapshot_id: remote.snapshotId,
    p_synced: true,
    p_tracks: databaseTracks(tracks),
  });
  if (tracksError) throw new Error(tracksError.message);
  return result.data.id;
}

export async function importSpotifyPlaylists(
  _state: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  const ids = [...new Set(formData.getAll("playlistIds").map(String))].filter(
    (id) => spotifyIdPattern.test(id)
  );
  if (!ids.length) return { error: "Selecciona al menos una playlist." };
  if (ids.length > 10) return { error: "Importa máximo 10 playlists por vez." };

  try {
    const client = await createSpotifyClient();
    const available = await getSpotifyPlaylists(client);
    const selected = available.filter((playlist) => ids.includes(playlist.id));
    if (selected.length !== ids.length) {
      return { error: "Una playlist seleccionada ya no está disponible." };
    }
    for (const playlist of selected) {
      const tracks = await getSpotifyPlaylistTracks(playlist.id, client);
      await saveImportedPlaylist(playlist, tracks);
    }
  } catch (error) {
    return { error: actionError(error) };
  }

  revalidatePath("/playlists");
  redirect(`/playlists?importadas=${ids.length}`);
}

export async function createPlaylist(
  _state: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  let playlistId: string;
  try {
    const fields = playlistFields(formData);
    const { client, playlist } = await createSpotifyPlaylist(fields);
    const { error, data } = await client.supabase
      .from("playlists")
      .insert({
        description: fields.description,
        external_url: playlist.externalUrl,
        is_public: fields.isPublic,
        name: fields.name,
        spotify_owner_id: client.user.id,
        spotify_playlist_id: playlist.id,
        spotify_snapshot_id: playlist.snapshotId,
        sync_status: "sincronizada",
        synced_at: new Date().toISOString(),
        use_at_class_end: fields.useAtClassEnd,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    playlistId = data.id;
  } catch (error) {
    return { error: actionError(error) };
  }

  revalidatePath("/playlists");
  redirect(`/playlists/${playlistId}/creada`);
}

export async function updatePlaylist(
  playlistId: string,
  _state: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  if (!uuidPattern.test(playlistId)) return { error: "Playlist inválida." };
  try {
    const fields = playlistFields(formData);
    const { supabase, user } = await authenticatedClient();
    const { data, error } = await supabase
      .from("playlists")
      .update({
        description: fields.description,
        is_public: fields.isPublic,
        name: fields.name,
        sync_status: "pendiente",
        updated_at: new Date().toISOString(),
        use_at_class_end: fields.useAtClassEnd,
      })
      .eq("id", playlistId)
      .eq("spotify_owner_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("No puedes editar esta playlist.");
  } catch (error) {
    return { error: actionError(error) };
  }

  revalidatePath(`/playlists/${playlistId}`);
  redirect(`/playlists/${playlistId}/sincronizar`);
}

function parseTracks(value: FormDataEntryValue | null) {
  const parsed = JSON.parse(String(value ?? "[]")) as unknown;
  if (!Array.isArray(parsed) || parsed.length > 500) {
    throw new Error("La playlist contiene una cantidad de canciones inválida.");
  }
  return parsed.map((track) => {
    if (!track || typeof track !== "object") throw new Error("Canción inválida.");
    const item = track as Record<string, unknown>;
    const title = String(item.title ?? "").trim();
    const spotifyUri = String(item.spotifyUri ?? "").trim();
    if (!title || !spotifyTrackUriPattern.test(spotifyUri)) {
      throw new Error("Todas las canciones deben provenir de Spotify.");
    }
    return {
      albumName: item.albumName ? String(item.albumName).slice(0, 200) : null,
      artist: item.artist ? String(item.artist).slice(0, 200) : null,
      durationSeconds:
        typeof item.durationSeconds === "number" && item.durationSeconds > 0
          ? Math.round(item.durationSeconds)
          : null,
      externalUrl: item.externalUrl ? String(item.externalUrl) : null,
      spotifyUri,
      title: title.slice(0, 200),
    } satisfies SpotifyTrack;
  });
}

export async function savePlaylistTracks(
  playlistId: string,
  _state: PlaylistActionState,
  formData: FormData
): Promise<PlaylistActionState> {
  if (!uuidPattern.test(playlistId)) return { error: "Playlist inválida." };
  try {
    const tracks = parseTracks(formData.get("tracks"));
    const { supabase, user } = await authenticatedClient();
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("spotify_owner_id", user.id)
      .maybeSingle();
    if (!playlist) throw new Error("No puedes editar esta playlist.");
    const { error } = await supabase.rpc("save_playlist_tracks", {
      p_playlist_id: playlistId,
      p_synced: false,
      p_tracks: databaseTracks(tracks),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    return { error: actionError(error) };
  }

  revalidatePath(`/playlists/${playlistId}`);
  redirect(`/playlists/${playlistId}/sincronizar`);
}

export async function synchronizePlaylist(
  playlistId: string,
  _state: PlaylistActionState,
  _formData: FormData
): Promise<PlaylistActionState> {
  void _state;
  void _formData;
  if (!uuidPattern.test(playlistId)) return { error: "Playlist inválida." };
  try {
    const client = await createSpotifyClient();
    const { data: playlist, error: playlistError } = await client.supabase
      .from("playlists")
      .select(
        "id, name, description, is_public, external_url, spotify_playlist_id, spotify_owner_id"
      )
      .eq("id", playlistId)
      .eq("spotify_owner_id", client.user.id)
      .maybeSingle();
    if (playlistError) throw new Error(playlistError.message);
    if (!playlist) throw new Error("No puedes sincronizar esta playlist.");
    const { data: tracks, error: tracksError } = await client.supabase
      .from("playlist_tracks")
      .select(
        "title, artist, album_name, duration_seconds, external_url, spotify_uri, position"
      )
      .eq("playlist_id", playlistId)
      .order("position");
    if (tracksError) throw new Error(tracksError.message);
    if (tracks?.some((track) => !track.spotify_uri)) {
      throw new Error(
        "Reemplaza las canciones locales por resultados de Spotify antes de sincronizar."
      );
    }

    let spotifyPlaylistId = playlist.spotify_playlist_id;
    if (!spotifyPlaylistId) {
      const created = await createSpotifyPlaylist({
        description: playlist.description,
        isPublic: playlist.is_public,
        name: playlist.name,
      });
      spotifyPlaylistId = created.playlist.id;
      const { error } = await client.supabase
        .from("playlists")
        .update({
          external_url: created.playlist.externalUrl,
          spotify_playlist_id: created.playlist.id,
        })
        .eq("id", playlistId);
      if (error) throw new Error(error.message);
    } else {
      await updateSpotifyPlaylist(
        spotifyPlaylistId,
        {
          description: playlist.description,
          isPublic: playlist.is_public,
          name: playlist.name,
        },
        client
      );
    }

    const snapshotId = await replaceSpotifyPlaylistItems(
      spotifyPlaylistId,
      tracks?.map((track) => track.spotify_uri as string) ?? [],
      client
    );
    const { error: saveError } = await client.supabase.rpc(
      "save_playlist_tracks",
      {
        p_playlist_id: playlistId,
        p_snapshot_id: snapshotId,
        p_synced: true,
        p_tracks: databaseTracks(
          (tracks ?? []).map((track) => ({
            albumName: track.album_name,
            artist: track.artist,
            durationSeconds: track.duration_seconds,
            externalUrl: track.external_url,
            spotifyUri: track.spotify_uri as string,
            title: track.title,
          }))
        ),
      }
    );
    if (saveError) throw new Error(saveError.message);
  } catch (error) {
    return { error: actionError(error) };
  }

  revalidatePath("/playlists");
  revalidatePath(`/playlists/${playlistId}`);
  redirect(`/playlists/${playlistId}/sincronizada`);
}

export async function refreshPlaylistFromSpotify(playlistId: string) {
  if (!uuidPattern.test(playlistId)) return;
  const client = await createSpotifyClient();
  const { data: playlist } = await client.supabase
    .from("playlists")
    .select("spotify_playlist_id")
    .eq("id", playlistId)
    .eq("spotify_owner_id", client.user.id)
    .maybeSingle();
  if (!playlist?.spotify_playlist_id) return;

  const remote = await getSpotifyPlaylist(playlist.spotify_playlist_id, client);
  const tracks = await getSpotifyPlaylistTracks(playlist.spotify_playlist_id, client);
  const { error } = await client.supabase
    .from("playlists")
    .update({
      description: remote.description,
      external_url: remote.externalUrl,
      is_public: remote.isPublic,
      name: remote.name,
    })
    .eq("id", playlistId);
  if (error) throw new Error(error.message);
  const { error: tracksError } = await client.supabase.rpc(
    "save_playlist_tracks",
    {
      p_playlist_id: playlistId,
      p_snapshot_id: remote.snapshotId,
      p_synced: true,
      p_tracks: databaseTracks(tracks),
    }
  );
  if (tracksError) throw new Error(tracksError.message);
  revalidatePath("/playlists");
  revalidatePath(`/playlists/${playlistId}`);
}

export async function disconnectSpotify() {
  const { supabase, user } = await authenticatedClient();
  await supabase.from("spotify_connections").delete().eq("user_id", user.id);
  revalidatePath("/playlists");
  redirect("/playlists/conectar");
}

export async function archivePlaylist(playlistId: string) {
  if (!uuidPattern.test(playlistId)) return;
  const { supabase, user } = await authenticatedClient();
  await supabase
    .from("playlists")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", playlistId)
    .eq("spotify_owner_id", user.id);
  revalidatePath("/playlists");
  redirect("/playlists");
}
