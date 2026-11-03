-- Custom topic cards: a colour style and an optional mood emoji.

alter table public.topics add column if not exists style text not null default 'plain'
  check (style in ('plain', 'sunset', 'ocean', 'forest', 'night', 'rose', 'gold'));
alter table public.topics add column if not exists mood text
  check (mood is null or char_length(mood) between 1 and 8);

-- Topic feed: same results as before, but a private author's city and languages
-- are hidden, and a private person's topics don't show on their profile page.
-- (Runs as definer now, so it repeats the topic and comment visibility rules.)
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
  last_comment_body text,
  style text,
  mood text
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
    lc.body as last_comment_body,
    t.style,
    t.mood
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
