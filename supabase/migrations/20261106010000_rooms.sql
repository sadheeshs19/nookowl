-- Voice rooms (version 1.1).
-- A host opens a room; anyone can join and listen. Listeners raise a hand and the host
-- brings them up to speak. Private rooms need an invite code. Everything that changes a
-- room goes through the functions below, so nobody can give themselves the mic.

create sequence if not exists public.room_agora_uid_seq minvalue 1 maxvalue 2000000000 cycle;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 80),
  tag text check (tag is null or char_length(tag) between 1 and 30),
  language text check (language is null or char_length(language) between 2 and 30),
  is_private boolean not null default false,
  invite_code text unique,
  status text not null default 'live' check (status in ('live', 'ended')),
  max_speakers int not null default 8 check (max_speakers between 2 and 12),
  max_listeners int not null default 50 check (max_listeners between 2 and 500),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists rooms_live_idx on public.rooms (status, created_at desc);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'listener' check (role in ('host', 'speaker', 'listener')),
  hand_raised boolean not null default false,
  hand_raised_at timestamptz,
  muted_by_host boolean not null default false,
  agora_uid int not null default nextval('public.room_agora_uid_seq'),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id, left_at);

create table if not exists public.room_bans (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.reports add column if not exists room_id uuid references public.rooms (id) on delete set null;

-- Someone counts as "in the room" if they haven't left and the app pinged recently.
create or replace function public.room_member_present(m public.room_members)
returns boolean language sql stable as $$
  select m.left_at is null and m.last_seen > now() - interval '90 seconds';
$$;

create or replace function public.is_room_member(p_room uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members m where m.room_id = p_room and m.user_id = p_user and m.left_at is null);
$$;

create or replace function public.room_role(p_room uuid, p_user uuid default auth.uid())
returns text language sql stable security definer set search_path = public as $$
  select role from room_members where room_id = p_room and user_id = p_user and left_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Who can see what (all writes go through the functions below)
-- ---------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_bans enable row level security;

drop policy if exists "see rooms" on public.rooms;
create policy "see rooms" on public.rooms for select to authenticated
  using ((not is_private and status = 'live') or public.is_room_member(id) or host_id = auth.uid() or public.is_admin());

drop policy if exists "see room members" on public.room_members;
create policy "see room members" on public.room_members for select to authenticated
  using (public.is_room_member(room_id) or public.is_admin());

-- The invite code is only for the host and moderators.
revoke select on public.rooms from anon, authenticated;
grant select (id, host_id, title, tag, language, is_private, status, max_speakers, max_listeners, created_at, ended_at)
  on public.rooms to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.check_words_room()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_banned_word(concat_ws(' ', new.title, new.tag)) then
    raise exception 'That includes words that aren’t allowed on Nooks Owl. Please keep it kind.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists rooms_words on public.rooms;
create trigger rooms_words before insert or update of title, tag on public.rooms
for each row execute function public.check_words_room();

create or replace function public.room_guard_live(p_room uuid)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from rooms where id = p_room;
  if not found then raise exception 'This room doesn’t exist.' using errcode = 'P0001'; end if;
  if r.status <> 'live' then raise exception 'This room has ended.' using errcode = 'P0001'; end if;
  return r;
end $$;

create or replace function public.room_require_host(p_room uuid)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public.room_guard_live(p_room);
  if r.host_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the host can do that.' using errcode = 'P0001';
  end if;
  return r;
end $$;

-- Ends rooms whose host has been gone for 2 minutes (app closed, phone died).
create or replace function public.end_abandoned_rooms()
returns void language sql security definer set search_path = public as $$
  update rooms r set status = 'ended', ended_at = now()
  where r.status = 'live'
    and not exists (
      select 1 from room_members m
      where m.room_id = r.id and m.user_id = r.host_id and m.left_at is null
        and m.last_seen > now() - interval '2 minutes');
$$;

-- ---------------------------------------------------------------------------
-- Actions
-- ---------------------------------------------------------------------------
create or replace function public.create_room(p_title text, p_tag text default null, p_language text default null, p_private boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  rid uuid;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if public.is_banned(me) then raise exception 'Your account has been suspended for breaking the Terms of Use.' using errcode = 'P0001'; end if;
  -- One live room per host: close any old one first.
  update rooms set status = 'ended', ended_at = now() where host_id = me and status = 'live';
  insert into rooms (host_id, title, tag, language, is_private, invite_code)
  values (me, trim(p_title), nullif(lower(trim(both '#' from trim(coalesce(p_tag, '')))), ''),
          nullif(trim(coalesce(p_language, '')), ''), p_private,
          case when p_private then upper(substr(md5(gen_random_uuid()::text), 1, 6)) end)
  returning id into rid;
  insert into room_members (room_id, user_id, role) values (rid, me, 'host');
  return rid;
end $$;

create or replace function public.join_room(p_room uuid, p_invite_code text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  existing public.room_members;
  listeners int;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  r := public.room_guard_live(p_room);
  if public.is_banned(me) then raise exception 'Your account has been suspended for breaking the Terms of Use.' using errcode = 'P0001'; end if;
  if exists (select 1 from room_bans where room_id = p_room and user_id = me) then
    raise exception 'The host removed you from this room.' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(me, r.host_id) then
    raise exception 'You can’t join this room.' using errcode = 'P0001';
  end if;

  select * into existing from room_members where room_id = p_room and user_id = me;
  if found then
    -- Coming back (e.g. after the app was closed): keep the role they had.
    update room_members set left_at = null, last_seen = now(), hand_raised = false
    where room_id = p_room and user_id = me;
    return existing.role;
  end if;

  if r.is_private and coalesce(upper(trim(p_invite_code)), '') <> coalesce(r.invite_code, '#') then
    raise exception 'This room is private. Ask the host for the invite code.' using errcode = 'P0001';
  end if;
  select count(*) into listeners from room_members m
  where m.room_id = p_room and public.room_member_present(m);
  if listeners >= r.max_listeners + r.max_speakers then
    raise exception 'This room is full right now.' using errcode = 'P0001';
  end if;
  insert into room_members (room_id, user_id, role) values (p_room, me, 'listener');
  return 'listener';
end $$;

create or replace function public.room_heartbeat(p_room uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.rooms; v_role text;
begin
  select * into r from rooms where id = p_room;
  if not found or r.status <> 'live' then return 'ended'; end if;
  update room_members set last_seen = now() where room_id = p_room and user_id = auth.uid() and left_at is null
  returning room_members.role into v_role;
  return coalesce(v_role, 'left');
end $$;

create or replace function public.leave_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from rooms where id = p_room;
  update room_members set left_at = now(), hand_raised = false where room_id = p_room and user_id = auth.uid();
  -- When the host leaves, the room ends.
  if found and r.host_id = auth.uid() and r.status = 'live' then
    update rooms set status = 'ended', ended_at = now() where id = p_room;
  end if;
end $$;

create or replace function public.raise_hand(p_room uuid, p_up boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.room_guard_live(p_room);
  update room_members set hand_raised = p_up, hand_raised_at = case when p_up then now() end
  where room_id = p_room and user_id = auth.uid() and left_at is null and role = 'listener';
end $$;

-- Host: bring someone up to speak, or move them back to listening.
create or replace function public.room_set_role(p_room uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms; speakers int;
begin
  r := public.room_require_host(p_room);
  if p_role not in ('speaker', 'listener') then raise exception 'Unknown role.'; end if;
  if p_user = r.host_id then raise exception 'The host always has the mic.' using errcode = 'P0001'; end if;
  if p_role = 'speaker' then
    select count(*) into speakers from room_members m
    where m.room_id = p_room and m.role in ('host', 'speaker') and public.room_member_present(m);
    if speakers >= r.max_speakers then
      raise exception 'The stage is full. Move someone back to listening first.' using errcode = 'P0001';
    end if;
  end if;
  update room_members set role = p_role, hand_raised = false, muted_by_host = false
  where room_id = p_room and user_id = p_user and left_at is null;
  if not found then raise exception 'They’re not in the room any more.' using errcode = 'P0001'; end if;
end $$;

-- Speakers can step down themselves.
create or replace function public.room_step_down(p_room uuid)
returns void language sql security definer set search_path = public as $$
  update room_members set role = 'listener', muted_by_host = false
  where room_id = p_room and user_id = auth.uid() and role = 'speaker';
$$;

create or replace function public.room_mute(p_room uuid, p_user uuid, p_muted boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.room_require_host(p_room);
  update room_members set muted_by_host = p_muted where room_id = p_room and user_id = p_user and role = 'speaker';
end $$;

-- Host: remove someone; they can't come back to this room.
create or replace function public.room_remove(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  r := public.room_require_host(p_room);
  if p_user = r.host_id then raise exception 'You can’t remove the host.' using errcode = 'P0001'; end if;
  update room_members set left_at = now(), role = 'listener', hand_raised = false where room_id = p_room and user_id = p_user;
  insert into room_bans (room_id, user_id) values (p_room, p_user) on conflict do nothing;
end $$;

create or replace function public.end_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.room_require_host(p_room);
  update rooms set status = 'ended', ended_at = now() where id = p_room;
  update room_members set left_at = coalesce(left_at, now()) where room_id = p_room;
end $$;

-- Host or moderators can see the invite code of a private room.
create or replace function public.room_invite_code(p_room uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from rooms where id = p_room;
  if r.host_id <> auth.uid() and not public.is_admin() then return null; end if;
  return r.invite_code;
end $$;

create or replace function public.find_room_by_code(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from rooms where invite_code = upper(trim(p_code)) and status = 'live' limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------
create or replace function public.list_live_rooms()
returns table (
  id uuid, title text, tag text, language text, is_private boolean, created_at timestamptz,
  host_id uuid, host_username text, host_avatar text,
  speaker_count bigint, listener_count bigint, i_am_in boolean,
  speaker_avatars text[]
)
language plpgsql security definer set search_path = public as $$
begin
  perform public.end_abandoned_rooms();
  return query
  select r.id, r.title, r.tag, r.language, r.is_private, r.created_at,
         r.host_id, hp.username, hp.avatar_path,
         (select count(*) from room_members m where m.room_id = r.id and m.role in ('host', 'speaker') and public.room_member_present(m)),
         (select count(*) from room_members m where m.room_id = r.id and m.role = 'listener' and public.room_member_present(m)),
         public.is_room_member(r.id),
         array(select p.avatar_path from room_members m join profiles p on p.id = m.user_id
               where m.room_id = r.id and m.role in ('host', 'speaker') and public.room_member_present(m)
               order by (m.role = 'host') desc, m.joined_at limit 3)
  from rooms r join profiles hp on hp.id = r.host_id
  where r.status = 'live'
    and not hp.banned
    and not public.is_blocked_between(auth.uid(), r.host_id)
    and (not r.is_private or public.is_room_member(r.id) or r.host_id = auth.uid())
  order by public.is_room_member(r.id) desc,
           (select count(*) from room_members m where m.room_id = r.id and public.room_member_present(m)) desc,
           r.created_at desc
  limit 100;
end $$;

-- Everyone in a room, with what the app needs to draw them.
create or replace function public.get_room_members(p_room uuid)
returns table (
  user_id uuid, username text, avatar_path text, gender text, role text,
  hand_raised boolean, hand_raised_at timestamptz, muted_by_host boolean, agora_uid int, joined_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_room_member(p_room) and not public.is_admin() then
    raise exception 'Join the room first.' using errcode = 'P0001';
  end if;
  return query
  select m.user_id, p.username, p.avatar_path, p.gender, m.role, m.hand_raised, m.hand_raised_at,
         m.muted_by_host, m.agora_uid, m.joined_at
  from room_members m join profiles p on p.id = m.user_id
  where m.room_id = p_room and public.room_member_present(m)
    and not public.is_blocked_between(auth.uid(), m.user_id)
  order by case m.role when 'host' then 0 when 'speaker' then 1 else 2 end, m.joined_at;
end $$;

-- Suspended people can't start or join rooms.
drop trigger if exists rooms_no_banned on public.rooms;
create trigger rooms_no_banned before insert on public.rooms for each row execute function public.block_banned();

do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null; end $$;
