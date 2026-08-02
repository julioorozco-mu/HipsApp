import { NextResponse } from "next/server";

import { searchSpotifyTracks, SpotifyError } from "@/lib/spotify/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json(
      { error: "Escribe al menos dos caracteres.", tracks: [] },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ tracks: await searchSpotifyTracks(query) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo buscar en Spotify.",
        tracks: [],
      },
      { status: error instanceof SpotifyError ? error.status : 500 }
    );
  }
}
