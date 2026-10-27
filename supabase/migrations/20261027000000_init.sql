-- Nook Owl: initial schema
-- Run with `supabase db push`, or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 24 and username ~ '^[A-Za-z0-9._]+$'),
  birth_year int not null,
  city text check (city is null or char_length(city) <= 40),
  bio text check (bio is null or char_length(bio) <= 160),
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  open_to_calls boolean not null default false,
  created_at timestamptz not null default now()
);

-- Everyone on Nook Owl must be 18 or older.
create or replace function public.enforce_adult()
returns trigger language plpgsql as $$
begin
  if new.birth_year > extract(year from now())::int - 18 then
    raise exception 'Nook Owl is for people aged 18 and over';
  end if;
  return new;
end $$;

create trigger profiles_adult
before insert or update of birth_year on public.profiles
for each row execute function public.enforce_adult();

-- ---------------------------------------------------------------------------
-- Blocks and reports
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete cascade,
  topic_id uuid,
  comment_id uuid,
  call_id uuid,
  reason text not null check (char_length(reason) between 2 and 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Topics, likes, comments
-- ---------------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 3 and 140),
  tags text[] not null default '{}' check (cardinality(tags) <= 3),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index topics_created_idx on public.topics (created_at desc);
create index topics_tags_idx on public.topics using gin (tags);

create table public.topic_likes (
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);

create table public.topic_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index topic_comments_topic_idx on public.topic_comments (topic_id, created_at);

-- ---------------------------------------------------------------------------
-- Messaging: a conversation starts as a request until the other person accepts
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'request' check (status in ('request', 'active', 'ignored')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a <> user_b)
);
create unique index conversations_pair_idx
  on public.conversations (least(user_a, user_b), greatest(user_a, user_b));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 1000),
  audio_path text,
  audio_ms int,
  created_at timestamptz not null default now(),
  check (body is not null or audio_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch after insert on public.messages
for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------------
-- Calls and call requests
-- ---------------------------------------------------------------------------
create table public.call_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  note text check (note is null or char_length(note) <= 140),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  check (from_id <> to_id)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  caller_rating int check (caller_rating between 1 and 5),
  callee_rating int check (callee_rating between 1 and 5),
  check (caller_id <> callee_id)
);
create index calls_callee_idx on public.calls (callee_id, status);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.topics enable row level security;
alter table public.topic_likes enable row level security;
alter table public.topic_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.call_requests enable row level security;
alter table public.calls enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated
  using (not public.is_blocked_between(auth.uid(), id));
create policy "insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own blocks" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "file reports" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "topics readable" on public.topics for select to authenticated
  using ((not hidden or user_id = auth.uid()) and not public.is_blocked_between(auth.uid(), user_id));
create policy "post own topics" on public.topics for insert to authenticated
  with check (user_id = auth.uid());
create policy "delete own topics" on public.topics for delete to authenticated
  using (user_id = auth.uid());

create policy "likes readable" on public.topic_likes for select to authenticated using (true);
create policy "like as self" on public.topic_likes for insert to authenticated
  with check (user_id = auth.uid());
create policy "unlike own" on public.topic_likes for delete to authenticated
  using (user_id = auth.uid());

create policy "comments readable" on public.topic_comments for select to authenticated
  using (not public.is_blocked_between(auth.uid(), user_id));
create policy "comment as self" on public.topic_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_blocked_between(
      auth.uid(), (select t.user_id from public.topics t where t.id = topic_id)
    )
  );
create policy "delete own or on own topic" on public.topic_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.topics t where t.id = topic_id and t.user_id = auth.uid())
  );

create policy "see own conversations" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));
create policy "start conversation" on public.conversations for insert to authenticated
  with check (
    created_by = auth.uid()
    and auth.uid() in (user_a, user_b)
    and not public.is_blocked_between(user_a, user_b)
  );
create policy "update own conversations" on public.conversations for update to authenticated
  using (auth.uid() in (user_a, user_b));

create policy "read messages in own conversations" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
  ));
create policy "send messages" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a, c.user_b)
        and (c.status = 'active' or c.created_by = auth.uid())
        and not public.is_blocked_between(c.user_a, c.user_b)
    )
  );

create policy "see own call requests" on public.call_requests for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "send call requests" on public.call_requests for insert to authenticated
  with check (
    from_id = auth.uid()
    and not public.is_blocked_between(from_id, to_id)
    and exists (select 1 from public.profiles p where p.id = to_id and p.open_to_calls)
  );
create policy "answer or cancel call requests" on public.call_requests for update to authenticated
  using (auth.uid() in (from_id, to_id));

-- Calls only happen when both sides opted in: the callee is open to calls,
-- the two already have an active chat, or the callee is the one starting it
-- (accepting a call request).
create policy "see own calls" on public.calls for select to authenticated
  using (auth.uid() in (caller_id, callee_id));
create policy "start calls" on public.calls for insert to authenticated
  with check (
    not public.is_blocked_between(caller_id, callee_id)
    and (
      callee_id = auth.uid()
      or (
        caller_id = auth.uid()
        and (
          exists (select 1 from public.profiles p where p.id = callee_id and p.open_to_calls)
          or exists (
            select 1 from public.conversations c
            where c.status = 'active'
              and least(c.user_a, c.user_b) = least(caller_id, callee_id)
              and greatest(c.user_a, c.user_b) = greatest(caller_id, callee_id)
          )
        )
      )
    )
  );
create policy "update own calls" on public.calls for update to authenticated
  using (auth.uid() in (caller_id, callee_id));

-- ---------------------------------------------------------------------------
-- Feed and search
-- ---------------------------------------------------------------------------
create or replace function public.get_topic_feed(q text default null, only_user uuid default null)
returns table (
  id uuid,
  body text,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  username text,
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
    t.id, t.body, t.tags, t.created_at, t.user_id, p.username, p.city, p.languages,
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

create or replace function public.get_trending_tags()
returns table (tag text, uses bigint)
language sql stable security invoker set search_path = public as $$
  select tg as tag, count(*) as uses
  from topics t, unnest(t.tags) tg
  where t.created_at > now() - interval '7 days' and not t.hidden
  group by tg
  order by uses desc
  limit 8;
$$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.call_requests;
alter publication supabase_realtime add table public.conversations;

-- ---------------------------------------------------------------------------
-- Voice notes storage: files live at voice-notes/<conversation id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

create policy "upload voice notes to own conversations" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'voice-notes'
  and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.user_a, c.user_b)
  )
);

create policy "read voice notes in own conversations" on storage.objects
for select to authenticated
using (
  bucket_id = 'voice-notes'
  and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.user_a, c.user_b)
  )
);
