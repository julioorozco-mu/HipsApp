import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  spotifyAuthorizationUrl,
  spotifyRedirectUri,
} from "@/lib/spotify/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/acceso", request.url));

  try {
    const state = randomBytes(32).toString("base64url");
    const cookieStore = await cookies();
    cookieStore.set("spotify_oauth_state", state, {
      httpOnly: true,
      maxAge: 600,
      path: "/api/spotify/callback",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return NextResponse.redirect(
      spotifyAuthorizationUrl(state, spotifyRedirectUri(request))
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo conectar Spotify.";
    const url = new URL("/playlists/conectar", request.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  }
}
