import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  saveSpotifyAuthorization,
  spotifyRedirectUri,
} from "@/lib/spotify/server";

export const runtime = "nodejs";

function matchesState(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("spotify_oauth_state")?.value;
  cookieStore.set("spotify_oauth_state", "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/api/spotify/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  if (
    providerError ||
    !code ||
    !state ||
    !expectedState ||
    !matchesState(state, expectedState)
  ) {
    const target = new URL("/playlists/conectar", request.url);
    target.searchParams.set(
      "error",
      providerError === "access_denied"
        ? "Cancelaste la conexión con Spotify."
        : "La autorización de Spotify no es válida o venció."
    );
    return NextResponse.redirect(target);
  }

  try {
    await saveSpotifyAuthorization(code, spotifyRedirectUri(request));
    return NextResponse.redirect(new URL("/playlists/importar", request.url));
  } catch (error) {
    const target = new URL("/playlists/conectar", request.url);
    target.searchParams.set(
      "error",
      error instanceof Error ? error.message : "No se pudo conectar Spotify."
    );
    return NextResponse.redirect(target);
  }
}
