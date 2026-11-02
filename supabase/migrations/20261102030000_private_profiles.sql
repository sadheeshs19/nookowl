-- Profile pages, and private profiles.
-- A private profile shows only nickname, photo and gender to strangers.
-- People you have an active chat with (and moderators) see everything.

alter table public.profiles add column if not exists allow_card_chats boolean not null default true;
alter table public.profiles add column if not exists is_private boolean not null default false;

-- May the signed-in person see all of `target`'s profile?
create or replace function public.can_see_full_profile(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = target
    or not coalesce((select is_private from public.profiles where id = target), false)
    or public.active_conversation_between(auth.uid(), target) is not null
    or public.is_admin();
$$;

-- The app can no longer read anyone's private details straight from the table
-- (birth year, city, bio, languages, interests, cover). They come through the
-- functions below, which apply the privacy rules.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_path, gender, open_to_calls, who_can_call,
              allow_card_chats, is_private, banned, created_at)
  on public.profiles to authenticated;

-- My own full profile.
create or replace function public.get_my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;

-- Someone's profile page.
create or replace function public.get_profile_view(target uuid)
returns table (
  id uuid, username text, avatar_path text, cover_path text, gender text,
  city text, bio text, languages text[], interests text[],
  open_to_calls boolean, allow_card_chats boolean, who_can_call text,
  is_private boolean, banned boolean, created_at timestamptz,
  limited boolean, topic_count bigint, can_call boolean, conversation_id uuid
)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.avatar_path,
         case when v.full then p.cover_path end,
         p.gender,
         case when v.full then p.city end,
         case when v.full then p.bio end,
         case when v.full then p.languages else '{}' end,
         case when v.full then p.interests else '{}' end,
         p.open_to_calls, p.allow_card_chats, p.who_can_call,
         p.is_private, p.banned, p.created_at,
         not v.full,
         case when v.full then (select count(*) from public.topics t where t.user_id = p.id and not t.hidden) else 0 end,
         p.id <> auth.uid() and public.can_call(auth.uid(), p.id),
         public.active_conversation_between(auth.uid(), p.id)
  from public.profiles p
  cross join lateral (select public.can_see_full_profile(p.id) as full) v
  where p.id = target
    and not public.is_blocked_between(auth.uid(), p.id);
$$;

-- People list, with private details hidden.
drop function if exists public.get_people_for_me();
create or replace function public.get_people_for_me()
returns table (
  id uuid, username text, avatar_path text, cover_path text, gender text,
  city text, bio text, languages text[], interests text[],
  open_to_calls boolean, allow_card_chats boolean, who_can_call text,
  is_private boolean, banned boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.avatar_path,
         case when v.full then p.cover_path end,
         p.gender,
         case when v.full then p.city end,
         case when v.full then p.bio end,
         case when v.full then p.languages else '{}' end,
         case when v.full then p.interests else '{}' end,
         p.open_to_calls, p.allow_card_chats, p.who_can_call,
         p.is_private, p.banned, p.created_at
  from public.profiles p
  cross join lateral (select public.can_see_full_profile(p.id) as full) v
  where p.open_to_calls
    and not p.banned
    and p.id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), p.id)
    and public.can_call(auth.uid(), p.id)
  order by p.created_at desc
  limit 50;
$$;

-- Topic feed: same results as before, but a private author's city and languages
-- are hidden, and a private person's topics don't show on their profile page.
-- (Runs as definer now, so it repeats the topic and comment visibility rules.)
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
language sql stable security definer set search_path = public as $$
  with needle as (
    select nullif(lower(trim(both '#' from trim(coalesce(q, '')))), '') as n
  )
  select
    t.id, t.body, t.tags, t.created_at, t.user_id, p.username, p.avatar_path,
    case when v.full then p.city end,
    case when v.full then p.languages else '{}' end,
    (select count(*) from topic_likes l where l.topic_id = t.id) as like_count,
    (select count(*) from topic_comments c
      where c.topic_id = t.id and not public.is_blocked_between(auth.uid(), c.user_id)) as comment_count,
    exists (select 1 from topic_likes l where l.topic_id = t.id and l.user_id = auth.uid()) as liked_by_me,
    lc.username as last_comment_username,
    lc.body as last_comment_body
  from topics t
  join profiles p on p.id = t.user_id
  cross join needle
  cross join lateral (select public.can_see_full_profile(t.user_id) as full) v
  left join lateral (
    select cp.username, c.body
    from topic_comments c join profiles cp on cp.id = c.user_id
    where c.topic_id = t.id and not public.is_blocked_between(auth.uid(), c.user_id)
    order by c.created_at desc
    limit 1
  ) lc on true
  where auth.uid() is not null
    and (not t.hidden or t.user_id = auth.uid())
    and not public.is_blocked_between(auth.uid(), t.user_id)
    and (only_user is null or (t.user_id = only_user and v.full))
    and (
      needle.n is null
      or lower(t.body) like '%' || needle.n || '%'
      or lower(p.username) like '%' || needle.n || '%'
      or exists (select 1 from unnest(t.tags) tg where lower(tg) like needle.n || '%')
      or (v.full and exists (select 1 from unnest(p.languages) lg where lower(lg) like needle.n || '%'))
    )
  order by t.created_at desc
  limit 100;
$$;
