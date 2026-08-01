export type SpotifyPlaylistSummary = {
  collaborative: boolean;
  description: string;
  externalUrl: string;
  id: string;
  isPublic: boolean;
  name: string;
  ownerId: string;
  snapshotId: string;
  totalItems: number;
};

export type SpotifyTrack = {
  albumName: string | null;
  artist: string | null;
  durationSeconds: number | null;
  externalUrl: string | null;
  spotifyUri: string;
  title: string;
};

export type PlaylistTrack = SpotifyTrack & {
  id?: string;
  position: number;
};

export type PlaylistSyncPreview = {
  added: number;
  detailsChanged: boolean;
  orderChanged: boolean;
  removed: number;
};
