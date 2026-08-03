drop policy if exists spotify_connections_owner_access
  on public.spotify_connections;

create policy spotify_connections_owner_access
  on public.spotify_connections
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      in ('superadmin', 'admin', 'instructor')
  )
  with check (
    user_id = (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      in ('superadmin', 'admin', 'instructor')
  );
