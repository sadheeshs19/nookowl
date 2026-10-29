-- Profile pictures and cover (background) images.
-- Files live in the public bucket profile-images/<user id>/<file>.
-- Only the owner can upload, replace or delete their own files.

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists cover_path text;

-- A profile can only point at its own files.
alter table public.profiles drop constraint if exists profile_images_are_own;
alter table public.profiles add constraint profile_images_are_own check (
  (avatar_path is null or avatar_path like id::text || '/%')
  and (cover_path is null or cover_path like id::text || '/%')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own profile images" on storage.objects;
create policy "upload own profile images" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read own profile images" on storage.objects;
create policy "read own profile images" on storage.objects
for select to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "update own profile images" on storage.objects;
create policy "update own profile images" on storage.objects
for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own profile images" on storage.objects;
create policy "delete own profile images" on storage.objects
for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- The feed now includes each author's picture.
drop function if exists public.get_topic_feed(text, uuid);
create or replace function public.get_topic_feed(q text default null, only_user uuid default null)
returns table (
  id uuid,
  body text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  username text,
  avatar_path text,
  city text,
  languages text[],
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean,
  last_comment_username text,
  last_comment_body text
)
language sql stable security invoker set search_path = public as $$
  with needle as (
    select nullif(lower(trim(both '#' from trim(coalesce(q, '')))), '') as n
  )
  select
    t.id, t.body, t.tags, t.created_at, t.user_id, p.username, p.avatar_path, p.city, p.languages,
    (select count(*) from topic_likes l where l.topic_id = t.id) as like_count,
    (select count(*) from topic_comments c where c.topic_id = t.id) as comment_count,
    exists (select 1 from topic_likes l where l.topic_id = t.id and l.user_id = auth.uid()) as liked_by_me,
    lc.username as last_comment_username,
    lc.body as last_comment_body
  from topics t
  join profiles p on p.id = t.user_id
  cross join needle
  left join lateral (
    select cp.username, c.body
    from topic_comments c join profiles cp on cp.id = c.user_id
    where c.topic_id = t.id
    order by c.created_at desc
    limit 1
  ) lc on true
  where (only_user is null or t.user_id = only_user)
    and (
      needle.n is null
      or lower(t.body) like '%' || needle.n || '%'
      or lower(p.username) like '%' || needle.n || '%'
      or exists (select 1 from unnest(t.tags) tg where lower(tg) like needle.n || '%')
      or exists (select 1 from unnest(p.languages) lg where lower(lg) like needle.n || '%')
    )
  order by t.created_at desc
  limit 100;
$$;
