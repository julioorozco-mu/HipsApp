create table if not exists public.spotify_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  spotify_user_id text not null,
  display_name text,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  token_expires_at timestamptz not null,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playlists
  drop constraint if exists playlists_name_key;

alter table public.playlists
  add column if not exists description text not null default '',
  add column if not exists is_public boolean not null default false,
  add column if not exists use_at_class_end boolean not null default true,
  add column if not exists spotify_playlist_id text,
  add column if not exists spotify_snapshot_id text,
  add column if not exists spotify_owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists sync_status text not null default 'local',
  add column if not exists synced_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.playlists
  drop constraint if exists playlists_sync_status_check;

alter table public.playlists
  add constraint playlists_sync_status_check
  check (sync_status in ('local', 'pendiente', 'sincronizada', 'error'));

alter table public.playlist_tracks
  add column if not exists spotify_uri text,
  add column if not exists album_name text;

create unique index if not exists playlists_spotify_playlist_id_key
  on public.playlists (spotify_playlist_id)
  where spotify_playlist_id is not null;

create index if not exists playlists_spotify_owner_idx
  on public.playlists (spotify_owner_id);

alter table public.spotify_connections enable row level security;

drop policy if exists playlists_owner_or_legacy
  on public.playlists;

create policy playlists_owner_or_legacy
  on public.playlists
  as restrictive
  for all
  to authenticated
  using (spotify_owner_id is null or spotify_owner_id = (select auth.uid()))
  with check (spotify_owner_id is null or spotify_owner_id = (select auth.uid()));

drop policy if exists playlist_tracks_owner_or_legacy
  on public.playlist_tracks;

create policy playlist_tracks_owner_or_legacy
  on public.playlist_tracks
  as restrictive
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and (
          playlists.spotify_owner_id is null
          or playlists.spotify_owner_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and (
          playlists.spotify_owner_id is null
          or playlists.spotify_owner_id = (select auth.uid())
        )
    )
  );

drop policy if exists spotify_connections_owner_access
  on public.spotify_connections;

create policy spotify_connections_owner_access
  on public.spotify_connections
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('instructor', 'admin')
  )
  with check (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('instructor', 'admin')
  );

revoke all on table public.spotify_connections from public, anon;
grant select, insert, update, delete on public.spotify_connections to authenticated;

create or replace function public.save_playlist_tracks(
  p_playlist_id uuid,
  p_tracks jsonb,
  p_snapshot_id text default null,
  p_synced boolean default false
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_track_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if jsonb_typeof(p_tracks) is distinct from 'array' then
    raise exception 'tracks must be a JSON array';
  end if;

  v_track_count := jsonb_array_length(p_tracks);
  if v_track_count > 1000 then
    raise exception 'playlist exceeds the 1000 item limit';
  end if;

  perform id
  from public.playlists
  where id = p_playlist_id
    and spotify_owner_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'playlist not found or not owned by current user';
  end if;

  delete from public.playlist_tracks
  where playlist_id = p_playlist_id;

  insert into public.playlist_tracks (
    playlist_id,
    title,
    artist,
    album_name,
    duration_seconds,
    position,
    external_url,
    spotify_uri
  )
  select
    p_playlist_id,
    coalesce(nullif(btrim(track.value ->> 'title'), ''), 'Canción'),
    nullif(btrim(track.value ->> 'artist'), ''),
    nullif(btrim(track.value ->> 'album_name'), ''),
    nullif(track.value ->> 'duration_seconds', '')::integer,
    track.ordinality::integer,
    nullif(btrim(track.value ->> 'external_url'), ''),
    nullif(btrim(track.value ->> 'spotify_uri'), '')
  from jsonb_array_elements(p_tracks) with ordinality as track(value, ordinality);

  update public.playlists
  set
    spotify_snapshot_id = case when p_synced then p_snapshot_id else spotify_snapshot_id end,
    sync_status = case when p_synced then 'sincronizada' else 'pendiente' end,
    synced_at = case when p_synced then now() else synced_at end,
    updated_at = now()
  where id = p_playlist_id;
end;
$$;

revoke all on function public.save_playlist_tracks(uuid, jsonb, text, boolean)
  from public, anon;
grant execute on function public.save_playlist_tracks(uuid, jsonb, text, boolean)
  to authenticated;
