import type { PlaylistSyncPreview } from "@/lib/spotify/types";

export function buildPlaylistSyncPreview(
  localUris: string[],
  remoteUris: string[],
  detailsChanged: boolean
): PlaylistSyncPreview {
  const localCounts = new Map<string, number>();
  const remoteCounts = new Map<string, number>();
  for (const uri of localUris) localCounts.set(uri, (localCounts.get(uri) ?? 0) + 1);
  for (const uri of remoteUris) remoteCounts.set(uri, (remoteCounts.get(uri) ?? 0) + 1);

  let added = 0;
  let removed = 0;
  for (const [uri, count] of localCounts) {
    added += Math.max(0, count - (remoteCounts.get(uri) ?? 0));
  }
  for (const [uri, count] of remoteCounts) {
    removed += Math.max(0, count - (localCounts.get(uri) ?? 0));
  }

  return {
    added,
    detailsChanged,
    orderChanged:
      localUris.length !== remoteUris.length ||
      localUris.some((uri, index) => uri !== remoteUris[index]),
    removed,
  };
}
