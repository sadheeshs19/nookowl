-- Hoots: a tiny "free to talk?" nudge between people who already have an active chat.
-- Back-and-forth like Facebook pokes: after you hoot someone, you can't hoot them
-- again until they hoot you back.

create table if not exists public.hoots (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index if not exists hoots_pair_idx on public.hoots (least(from_id, to_id), greatest(from_id, to_id), created_at desc);
create index if not exists hoots_to_idx on public.hoots (to_id, created_at desc);

alter table public.hoots enable row level security;
-- Read your own hoots. Hoots are only sent through send_hoot().
drop policy if exists "see own hoots" on public.hoots;
create policy "see own hoots" on public.hoots for select to authenticated
  using (auth.uid() in (from_id, to_id));

-- The active chat between two people, if any.
create or replace function public.active_conversation_between(a uuid, b uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select c.id from public.conversations c
  where c.status = 'active'
    and least(c.user_a, c.user_b) = least(a, b)
    and greatest(c.user_a, c.user_b) = greatest(a, b)
  limit 1;
$$;

-- Where things stand between me and someone else.
create or replace function public.get_hoot_state(other uuid)
returns table (can_hoot boolean, total int, last_from uuid, last_at timestamptz, connected boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  last public.hoots;
  n int;
  conn boolean;
begin
  conn := public.active_conversation_between(me, other) is not null
          and not public.is_blocked_between(me, other);
  select * into last from public.hoots h
  where least(h.from_id, h.to_id) = least(me, other) and greatest(h.from_id, h.to_id) = greatest(me, other)
  order by h.created_at desc limit 1;
  select count(*) into n from public.hoots h
  where least(h.from_id, h.to_id) = least(me, other) and greatest(h.from_id, h.to_id) = greatest(me, other);
  return query select conn and (last.id is null or last.from_id <> me), n, last.from_id, last.created_at, conn;
end $$;

create or replace function public.send_hoot(other uuid)
returns table (can_hoot boolean, total int, last_from uuid, last_at timestamptz, connected boolean)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s record;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select * into s from public.get_hoot_state(other);
  if not s.connected then
    raise exception 'You can only hoot people you have an active chat with.';
  end if;
  if not s.can_hoot then
    raise exception 'Wait for them to hoot back first.';
  end if;
  insert into public.hoots (from_id, to_id) values (me, other);
  return query select * from public.get_hoot_state(other);
end $$;

-- People who hooted me and are waiting for a hoot back (newest first).
create or replace function public.list_hoots_for_me()
returns table (from_id uuid, username text, avatar_path text, created_at timestamptz, total int, conversation_id uuid)
language sql stable security definer set search_path = public as $$
  with mine as (
    select h.*, row_number() over (
      partition by least(h.from_id, h.to_id), greatest(h.from_id, h.to_id) order by h.created_at desc) as rn,
      count(*) over (partition by least(h.from_id, h.to_id), greatest(h.from_id, h.to_id)) as n
    from public.hoots h
    where auth.uid() in (h.from_id, h.to_id)
  )
  select m.from_id, p.username, p.avatar_path, m.created_at, m.n::int,
         public.active_conversation_between(m.from_id, m.to_id)
  from mine m join public.profiles p on p.id = m.from_id
  where m.rn = 1 and m.to_id = auth.uid()
    and not public.is_blocked_between(m.from_id, m.to_id)
    and public.active_conversation_between(m.from_id, m.to_id) is not null
  order by m.created_at desc;
$$;

create or replace function public.push_on_hoot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.send_push(new.to_id, public.username_of(new.from_id) || ' hooted at you 🦉',
    'Hoot back, or give them a call.',
    jsonb_build_object('type', 'hoot', 'conversationId', public.active_conversation_between(new.from_id, new.to_id)));
  return new;
end $$;
drop trigger if exists hoots_push on public.hoots;
create trigger hoots_push after insert on public.hoots
for each row execute function public.push_on_hoot();

do $$ begin
  alter publication supabase_realtime add table public.hoots;
exception when duplicate_object then null; end $$;
