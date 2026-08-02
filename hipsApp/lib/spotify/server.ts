import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import type {
  SpotifyPlaylistSummary,
  SpotifyTrack,
} from "@/lib/spotify/types";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-private",
];

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: "Bearer";
};

type SpotifyProfile = {
  display_name: string | null;
  id: string;
};

type SpotifyPlaylistObject = {
  collaborative: boolean;
  description: string | null;
  external_urls: { spotify: string };
  id: string;
  items?: { total: number };
  name: string;
  owner: { id: string };
  public: boolean | null;
  snapshot_id: string;
  tracks?: { total: number };
};

type SpotifyTrackObject = {
  album?: { name: string };
  artists?: { name: string }[];
  duration_ms?: number;
  external_urls?: { spotify?: string };
  name: string;
  type: string;
  uri: string;
};

type Page<T> = {
  items: T[];
  next: string | null;
  offset: number;
  total: number;
};

export class SpotifyError extends Error {
  constructor(
    message: string,
    public readonly status = 500
  ) {
    super(message);
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new SpotifyError(`Falta configurar ${name}.`, 503);
  return value;
}

function spotifyCredentials() {
  return {
    clientId: requiredEnvironment("SPOTIFY_CLIENT_ID"),
    clientSecret: requiredEnvironment("SPOTIFY_CLIENT_SECRET"),
  };
}

export function isSpotifyConfigured() {
  return [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_TOKEN_ENCRYPTION_KEY",
  ].every((name) => Boolean(process.env[name]?.trim()));
}

function encryptionKey() {
  const key = Buffer.from(
    requiredEnvironment("SPOTIFY_TOKEN_ENCRYPTION_KEY"),
    "base64"
  );
  if (key.length !== 32) {
    throw new SpotifyError(
      "SPOTIFY_TOKEN_ENCRYPTION_KEY debe contener 32 bytes en Base64.",
      503
    );
  }
  return key;
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new SpotifyError("El token de Spotify almacenado no es válido.", 500);
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function tokenRequest(parameters: URLSearchParams) {
  const { clientId, clientSecret } = spotifyCredentials();
  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parameters,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new SpotifyError(
      "Spotify rechazó la autorización. Intenta conectar la cuenta nuevamente.",
      response.status
    );
  }
  return (await response.json()) as TokenResponse;
}

export function spotifyRedirectUri(request: Request) {
  return (
    process.env.SPOTIFY_REDIRECT_URI?.trim() ||
    new URL("/api/spotify/callback", request.url).toString()
  );
}

export function spotifyAuthorizationUrl(state: string, redirectUri: string) {
  const { clientId } = spotifyCredentials();
  const url = new URL(`${SPOTIFY_ACCOUNTS_URL}/authorize`);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: SPOTIFY_SCOPES.join(" "),
    show_dialog: "true",
  }).toString();
  return url;
}

async function spotifyFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {}
) {
  if (!path.startsWith("/")) throw new SpotifyError("Ruta de Spotify inválida.");
  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    if (response.status === 429) {
      throw new SpotifyError(
        `Spotify limitó temporalmente las solicitudes${retryAfter ? `; reintenta en ${retryAfter} s` : ""}.`,
        429
      );
    }
    throw new SpotifyError(
      response.status === 401
        ? "La conexión con Spotify venció. Vuelve a conectar la cuenta."
        : "Spotify no pudo completar la operación.",
      response.status
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function saveSpotifyAuthorization(
  code: string,
  redirectUri: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new SpotifyError("Inicia sesión en HipsApp.", 401);

  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    })
  );
  const profile = await spotifyFetch<SpotifyProfile>(token.access_token, "/me");
  const { data: existing, error: existingError } = await supabase
    .from("spotify_connections")
    .select("refresh_token_ciphertext")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) throw new SpotifyError(existingError.message);
  const refreshToken = token.refresh_token
    ? encryptSecret(token.refresh_token)
    : existing?.refresh_token_ciphertext;

  if (!refreshToken) {
    throw new SpotifyError("Spotify no devolvió un token de renovación.", 502);
  }

  const { error } = await supabase.from("spotify_connections").upsert({
    access_token_ciphertext: encryptSecret(token.access_token),
    display_name: profile.display_name,
    refresh_token_ciphertext: refreshToken,
    scope: token.scope ?? SPOTIFY_SCOPES.join(" "),
    spotify_user_id: profile.id,
    token_expires_at: new Date(
      Date.now() + token.expires_in * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
    user_id: user.id,
  });
  if (error) {
    throw new SpotifyError(`No se pudo guardar la conexión: ${error.message}`);
  }
}

export type SpotifyClient = Awaited<ReturnType<typeof createSpotifyClient>>;

export async function createSpotifyClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new SpotifyError("Inicia sesión en HipsApp.", 401);

  const { data: connection, error } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new SpotifyError(error.message);
  if (!connection) {
    throw new SpotifyError("Conecta tu cuenta de Spotify para continuar.", 401);
  }

  let accessToken = decryptSecret(connection.access_token_ciphertext);
  if (new Date(connection.token_expires_at).getTime() <= Date.now() + 60_000) {
    const refreshed = await tokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptSecret(connection.refresh_token_ciphertext),
      })
    );
    accessToken = refreshed.access_token;
    const { error: refreshError } = await supabase
      .from("spotify_connections")
      .update({
        access_token_ciphertext: encryptSecret(refreshed.access_token),
        refresh_token_ciphertext: refreshed.refresh_token
          ? encryptSecret(refreshed.refresh_token)
          : connection.refresh_token_ciphertext,
        scope: refreshed.scope ?? connection.scope,
        token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (refreshError) throw new SpotifyError(refreshError.message);
  }

  return {
    connection,
    request<T>(path: string, init?: RequestInit) {
      return spotifyFetch<T>(accessToken, path, init);
    },
    supabase,
    user,
  };
}

function playlistSummary(playlist: SpotifyPlaylistObject): SpotifyPlaylistSummary {
  return {
    collaborative: playlist.collaborative,
    description: playlist.description ?? "",
    externalUrl: playlist.external_urls.spotify,
    id: playlist.id,
    isPublic: playlist.public ?? false,
    name: playlist.name,
    ownerId: playlist.owner.id,
    snapshotId: playlist.snapshot_id,
    totalItems: playlist.items?.total ?? playlist.tracks?.total ?? 0,
  };
}

function normalizedTrack(item: SpotifyTrackObject): SpotifyTrack | null {
  if (item.type !== "track" || !item.uri) return null;
  return {
    albumName: item.album?.name ?? null,
    artist: item.artists?.map(({ name }) => name).join(", ") || null,
    durationSeconds: item.duration_ms
      ? Math.max(1, Math.round(item.duration_ms / 1000))
      : null,
    externalUrl: item.external_urls?.spotify ?? null,
    spotifyUri: item.uri,
    title: item.name,
  };
}

export async function getSpotifyPlaylists(client?: SpotifyClient) {
  client ??= await createSpotifyClient();
  const playlists: SpotifyPlaylistSummary[] = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const page = await client.request<Page<SpotifyPlaylistObject>>(
      `/me/playlists?limit=50&offset=${offset}`
    );
    playlists.push(
      ...page.items
        .filter(
          (playlist) =>
            playlist.owner.id === client.connection.spotify_user_id ||
            playlist.collaborative
        )
        .map(playlistSummary)
    );
    if (!page.next) break;
  }
  return playlists;
}

export async function getSpotifyPlaylist(
  playlistId: string,
  client?: SpotifyClient
) {
  client ??= await createSpotifyClient();
  return playlistSummary(
    await client.request<SpotifyPlaylistObject>(`/playlists/${playlistId}`)
  );
}

export async function getSpotifyPlaylistTracks(
  playlistId: string,
  client?: SpotifyClient
) {
  client ??= await createSpotifyClient();
  const tracks: SpotifyTrack[] = [];
  for (let offset = 0; offset < 1000; offset += 50) {
    const page = await client.request<
      Page<{ item: SpotifyTrackObject | null }>
    >(`/playlists/${playlistId}/items?limit=50&offset=${offset}`);
    tracks.push(
      ...page.items
        .map(({ item }) => (item ? normalizedTrack(item) : null))
        .filter((track): track is SpotifyTrack => Boolean(track))
    );
    if (!page.next) break;
  }
  return tracks;
}

export async function searchSpotifyTracks(query: string) {
  const client = await createSpotifyClient();
  const result = await client.request<{
    tracks: Page<SpotifyTrackObject>;
  }>(`/search?type=track&limit=10&q=${encodeURIComponent(query)}`);
  return result.tracks.items
    .map(normalizedTrack)
    .filter((track): track is SpotifyTrack => Boolean(track));
}

export async function createSpotifyPlaylist(input: {
  description: string;
  isPublic: boolean;
  name: string;
}) {
  const client = await createSpotifyClient();
  const playlist = await client.request<SpotifyPlaylistObject>(
    `/users/${encodeURIComponent(client.connection.spotify_user_id)}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        description: input.description,
        name: input.name,
        public: input.isPublic,
      }),
    }
  );
  return { client, playlist: playlistSummary(playlist) };
}

export async function updateSpotifyPlaylist(
  playlistId: string,
  input: { description: string; isPublic: boolean; name: string },
  client?: SpotifyClient
) {
  client ??= await createSpotifyClient();
  await client.request<void>(`/playlists/${playlistId}`, {
    method: "PUT",
    body: JSON.stringify({
      description: input.description,
      name: input.name,
      public: input.isPublic,
    }),
  });
}

export async function replaceSpotifyPlaylistItems(
  playlistId: string,
  uris: string[],
  client?: SpotifyClient
) {
  client ??= await createSpotifyClient();
  let snapshotId: string | null = null;
  const first = await client.request<{ snapshot_id: string }>(
    `/playlists/${playlistId}/items`,
    { method: "PUT", body: JSON.stringify({ uris: uris.slice(0, 100) }) }
  );
  snapshotId = first.snapshot_id;

  for (let index = 100; index < uris.length; index += 100) {
    const added = await client.request<{ snapshot_id: string }>(
      `/playlists/${playlistId}/items`,
      {
        method: "POST",
        body: JSON.stringify({ uris: uris.slice(index, index + 100) }),
      }
    );
    snapshotId = added.snapshot_id;
  }
  return snapshotId;
}
