-- Nooks Owl: call credits (free daily minutes + rewarded ads) and push notifications.
-- Run after 20261027000000_init.sql (SQL Editor > paste > Run, or `supabase db push`).

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Credits
-- Callers spend minutes; answering is always free. Everyone gets FREE_SECONDS
-- each day (India time), and can earn AD_SECONDS per rewarded ad, up to
-- MAX_ADS_PER_DAY. Ad minutes carry over; free minutes don't.
-- ---------------------------------------------------------------------------
create table public.credits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  free_seconds int not null default 600,
  free_day date not null default (now() at time zone 'Asia/Kolkata')::date,
  bonus_seconds int not null default 0,
  ads_today int not null default 0,
  ads_day date not null default (now() at time zone 'Asia/Kolkata')::date,
  last_ad_at timestamptz
);
alter table public.credits enable row level security;
-- Read-only for the owner; all changes go through the functions below.
create policy "read own credits" on public.credits for select to authenticated using (user_id = auth.uid());

create or replace function public.credit_settings()
returns table (free_seconds int, ad_seconds int, max_ads_per_day int)
language sql immutable as $$ select 600, 300, 10 $$;

-- Creates the row if missing and applies the daily reset. Internal.
create or replace function public.refresh_credits(uid uuid)
returns public.credits
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  s record;
  row public.credits;
begin
  select * into s from public.credit_settings();
  insert into public.credits (user_id, free_seconds) values (uid, s.free_seconds)
  on conflict (user_id) do nothing;
  update public.credits c set
    free_seconds = case when c.free_day < today then s.free_seconds else c.free_seconds end,
    free_day = today,
    ads_today = case when c.ads_day < today then 0 else c.ads_today end,
    ads_day = today
  where c.user_id = uid
  returning * into row;
  return row;
end $$;
revoke all on function public.refresh_credits(uuid) from public, anon, authenticated;

create or replace function public.credit_seconds_of(uid uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare row public.credits;
begin
  row := public.refresh_credits(uid);
  return row.free_seconds + row.bonus_seconds;
end $$;
revoke all on function public.credit_seconds_of(uuid) from public, anon;

create or replace function public.get_credits()
returns table (free_seconds int, bonus_seconds int, total_seconds int, ads_today int, ads_left int, ad_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  row public.credits;
  s record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into s from public.credit_settings();
  row := public.refresh_credits(auth.uid());
  return query select row.free_seconds, row.bonus_seconds, row.free_seconds + row.bonus_seconds,
    row.ads_today, greatest(0, s.max_ads_per_day - row.ads_today), s.ad_seconds;
end $$;

-- Called by the app after Google says the person watched a rewarded ad.
-- (Before a big launch, switch to AdMob server-side verification.)
create or replace function public.claim_ad_reward()
returns table (free_seconds int, bonus_seconds int, total_seconds int, ads_today int, ads_left int, ad_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  row public.credits;
  s record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into s from public.credit_settings();
  row := public.refresh_credits(auth.uid());
  if row.ads_today >= s.max_ads_per_day then
    raise exception 'You’ve reached today’s ad limit. Free minutes come back tomorrow.';
  end if;
  if row.last_ad_at is not null and row.last_ad_at > now() - interval '15 seconds' then
    raise exception 'Please wait a moment before watching another ad.';
  end if;
  update public.credits c set
    bonus_seconds = c.bonus_seconds + s.ad_seconds,
    ads_today = c.ads_today + 1,
    last_ad_at = now()
  where c.user_id = auth.uid();
  return query select * from public.get_credits();
end $$;

-- ---------------------------------------------------------------------------
-- Calls: server-side times, no reopening, and charge the caller at the end.
-- ---------------------------------------------------------------------------
create or replace function public.calls_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.ended_at := null;
    new.accepted_at := case when new.status = 'accepted' then now() else null end;
    return new;
  end if;

  -- Who and where never change.
  new.caller_id := old.caller_id;
  new.callee_id := old.callee_id;
  new.channel := old.channel;
  new.created_at := old.created_at;

  -- A finished call stays finished.
  if old.status in ('ended', 'declined', 'missed') then
    new.status := old.status;
    new.accepted_at := old.accepted_at;
    new.ended_at := old.ended_at;
    return new;
  end if;

  if new.status = 'accepted' and old.status <> 'accepted' then
    new.accepted_at := now();
  else
    new.accepted_at := old.accepted_at;
  end if;

  if new.status in ('ended', 'declined', 'missed') then
    new.ended_at := now();
  else
    new.ended_at := null;
  end if;
  return new;
end $$;

create trigger calls_guard before insert or update on public.calls
for each row execute function public.calls_guard();

create or replace function public.charge_call()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  used int;
  row public.credits;
  from_free int;
begin
  if new.status = 'ended' and old.status <> 'ended' and new.accepted_at is not null then
    used := greatest(0, ceil(extract(epoch from (new.ended_at - new.accepted_at)))::int);
    row := public.refresh_credits(new.caller_id);
    from_free := least(used, row.free_seconds);
    update public.credits c set
      free_seconds = c.free_seconds - from_free,
      bonus_seconds = greatest(0, c.bonus_seconds - (used - from_free))
    where c.user_id = new.caller_id;
  end if;
  return new;
end $$;

create trigger calls_charge after update on public.calls
for each row execute function public.charge_call();

-- How long this call may last: the caller's minutes when it started.
-- The token function uses it so the call really stops when minutes run out.
create or replace function public.call_seconds_allowed(p_call_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare c public.calls;
begin
  select * into c from public.calls where id = p_call_id and auth.uid() in (caller_id, callee_id);
  if not found then return 0; end if;
  return public.credit_seconds_of(c.caller_id);
end $$;

-- Starting a call or sending a call request needs at least a minute left.
drop policy if exists "start calls" on public.calls;
create policy "start calls" on public.calls for insert to authenticated
  with check (
    not public.is_blocked_between(caller_id, callee_id)
    and public.credit_seconds_of(caller_id) >= 60
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

drop policy if exists "send call requests" on public.call_requests;
create policy "send call requests" on public.call_requests for insert to authenticated
  with check (
    from_id = auth.uid()
    and not public.is_blocked_between(from_id, to_id)
    and public.credit_seconds_of(from_id) >= 60
    and exists (select 1 from public.profiles p where p.id = to_id and p.open_to_calls)
  );

-- ---------------------------------------------------------------------------
-- Push notifications (Expo push service)
-- Tokens are private: only their owner can see or change them.
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null check (token like 'ExponentPushToken[%' or token like 'ExpoPushToken[%'),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "own push token" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.send_push(uid uuid, title text, body text, data jsonb, channel text default 'default')
returns void
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select token into t from public.push_tokens where user_id = uid;
  if t is null then return; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := jsonb_build_object(
      'to', t, 'title', title, 'body', body, 'data', data,
      'sound', 'default', 'priority', 'high', 'channelId', channel
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  -- A failed push must never block a call or a message.
  null;
end $$;
revoke all on function public.send_push(uuid, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.username_of(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select username from public.profiles where id = uid), 'Someone');
$$;

create or replace function public.push_on_call()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'ringing' then
    perform public.send_push(new.callee_id, public.username_of(new.caller_id) || ' is calling you',
      'Tap to answer. Answering is free.', jsonb_build_object('type', 'call', 'callId', new.id), 'calls');
  elsif tg_op = 'INSERT' and new.status = 'accepted' then
    -- The callee accepted the caller's call request: tell the caller to join.
    perform public.send_push(new.caller_id, public.username_of(new.callee_id) || ' accepted your call request',
      'Tap to join the call now.', jsonb_build_object('type', 'call', 'callId', new.id), 'calls');
  end if;
  return new;
end $$;
create trigger calls_push after insert on public.calls
for each row execute function public.push_on_call();

create or replace function public.push_on_call_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.send_push(new.to_id, public.username_of(new.from_id) || ' wants to talk',
    coalesce(new.note, 'Open Requests to accept. It expires in 15 minutes.'),
    jsonb_build_object('type', 'request', 'requestId', new.id));
  return new;
end $$;
create trigger call_requests_push after insert on public.call_requests
for each row execute function public.push_on_call_request();

create or replace function public.push_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c public.conversations;
  other uuid;
  preview text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  other := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  if c.status = 'ignored' then return new; end if;
  if c.status = 'request' then
    -- Keep strangers' first messages private until accepted.
    perform public.send_push(other, 'New message request',
      public.username_of(new.sender_id) || ' wants to chat with you.',
      jsonb_build_object('type', 'message', 'conversationId', c.id));
  else
    preview := case when new.audio_path is not null then 'Voice note' else left(new.body, 120) end;
    perform public.send_push(other, public.username_of(new.sender_id), preview,
      jsonb_build_object('type', 'message', 'conversationId', c.id));
  end if;
  return new;
end $$;
create trigger messages_push after insert on public.messages
for each row execute function public.push_on_message();
