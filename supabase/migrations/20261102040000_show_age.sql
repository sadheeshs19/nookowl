-- Show age (worked out from birth year) on profiles, unless the person hides it.
-- Private profiles hide it from strangers too. The birth year itself is never shown.

alter table public.profiles add column if not exists show_age boolean not null default true;
grant select (show_age) on public.profiles to authenticated;

-- Someone's profile page.
drop function if exists public.get_profile_view(uuid);
create or replace function public.get_profile_view(target uuid)
returns table (
  id uuid, username text, avatar_path text, cover_path text, gender text,
  city text, bio text, languages text[], interests text[],
  open_to_calls boolean, allow_card_chats boolean, who_can_call text,
  is_private boolean, banned boolean, created_at timestamptz,
  limited boolean, topic_count bigint, can_call boolean, conversation_id uuid,
  show_age boolean, age int
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
         public.active_conversation_between(auth.uid(), p.id),
         p.show_age,
         case when v.full and p.show_age then extract(year from now())::int - p.birth_year end
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
  is_private boolean, banned boolean, created_at timestamptz,
  show_age boolean, age int
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
         p.show_age,
         case when v.full and p.show_age then extract(year from now())::int - p.birth_year end
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
