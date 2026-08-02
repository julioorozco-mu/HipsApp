import assert from "node:assert/strict";
import test from "node:test";

import { buildPlaylistSyncPreview } from "./spotify-sync.ts";

test("detecta altas, bajas y cambios de orden de Spotify", () => {
  assert.deepEqual(
    buildPlaylistSyncPreview(
      ["spotify:track:a", "spotify:track:c", "spotify:track:b"],
      ["spotify:track:a", "spotify:track:b", "spotify:track:d"],
      true
    ),
    { added: 1, detailsChanged: true, orderChanged: true, removed: 1 }
  );
});

test("reconoce una playlist sin cambios", () => {
  assert.deepEqual(
    buildPlaylistSyncPreview(
      ["spotify:track:a", "spotify:track:b"],
      ["spotify:track:a", "spotify:track:b"],
      false
    ),
    { added: 0, detailsChanged: false, orderChanged: false, removed: 0 }
  );
});
