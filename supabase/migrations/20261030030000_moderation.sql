-- Moderation: a word filter on everything people write, moderators who review
-- reports, and suspending (banning) accounts.

-- ---------------------------------------------------------------------------
-- Word filter
-- ---------------------------------------------------------------------------
create table if not exists public.banned_words (
  word text primary key check (word = lower(word))
);
alter table public.banned_words enable row level security;
-- Nobody reads or edits the list from the app; it's managed in the dashboard.

insert into public.banned_words (word) values
  -- sexual
  ('sex chat'), ('sexting'), ('nudes'), ('send nudes'), ('nude pic'), ('porn'), ('porno'), ('pornhub'),
  ('xxx'), ('horny'), ('boobs'), ('tits'), ('pussy'), ('dick pic'), ('cock'), ('blowjob'), ('handjob'),
  ('cum'), ('cumshot'), ('orgasm'), ('masturbate'), ('jerk off'), ('onlyfans'), ('escort'), ('hookup'),
  ('one night stand'), ('sugar daddy'), ('call girl'), ('nangi'), ('chut'), ('lund'), ('gaand'),
  -- abuse and slurs
  ('fuck'), ('fucking'), ('motherfucker'), ('bitch'), ('slut'), ('whore'), ('cunt'), ('bastard'),
  ('retard'), ('faggot'), ('fag'), ('nigger'), ('nigga'), ('chink'), ('paki'), ('tranny'),
  ('madarchod'), ('behenchod'), ('bhenchod'), ('chutiya'), ('randi'), ('harami'), ('kutta kamina'),
  ('mc bc'), ('bsdk'), ('bhosdike'),
  -- self-harm and violence
  ('kill yourself'), ('kys'), ('i will kill you'), ('rape'),
  -- scams and contact sharing
  ('paytm me'), ('send money'), ('gpay me'), ('upi id'), ('bitcoin'), ('crypto investment')
on conflict do nothing;

-- Lower-case, undo common letter swaps (0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s, !→i, |→i)
-- and turn anything that isn't a letter or digit into a space.
create or replace function public.normalize_for_filter(t text)
returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t, '')), '0134@$5!|', 'oieaassii'), '[^a-z0-9]+', ' ', 'g');
$$;

create or replace function public.has_banned_word(t text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.banned_words w
    where ' ' || public.normalize_for_filter(t) || ' ' like '% ' || w.word || ' %'
  );
$$;

create or replace function public.check_words()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(new);
  t text;
begin
  -- Every text field people can write, whichever table this is.
  t := concat_ws(' ', j->>'body', j->>'note', j->>'username', j->>'bio', j->>'city',
         (select string_agg(x, ' ') from jsonb_array_elements_text(coalesce(j->'tags', '[]'::jsonb)) x));
  if public.has_banned_word(t) then
    raise exception 'That includes words that aren’t allowed on Nooks Owl. Please keep it kind.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists topics_words on public.topics;
create trigger topics_words before insert or update of body, tags on public.topics
for each row execute function public.check_words();
drop trigger if exists comments_words on public.topic_comments;
create trigger comments_words before insert or update of body on public.topic_comments
for each row execute function public.check_words();
drop trigger if exists messages_words on public.messages;
create trigger messages_words before insert or update of body on public.messages
for each row when (new.body is not null) execute function public.check_words();
drop trigger if exists call_requests_words on public.call_requests;
create trigger call_requests_words before insert or update of note on public.call_requests
for each row when (new.note is not null) execute function public.check_words();
drop trigger if exists profiles_words on public.profiles;
create trigger profiles_words before insert or update of username, bio, city on public.profiles
for each row execute function public.check_words();

-- ---------------------------------------------------------------------------
-- Moderators
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade
);
alter table public.admins enable row level security;
-- Add moderators in the dashboard: insert into public.admins (user_id) values ('<user id>');

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Suspended accounts
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists banned boolean not null default false;

-- Only moderators can change who is banned.
create or replace function public.guard_banned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the dashboard and server code, which may change it.
  if new.banned is distinct from old.banned and auth.uid() is not null and not public.is_admin() then
    new.banned := old.banned;
  end if;
  if new.banned then
    new.open_to_calls := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_banned on public.profiles;
create trigger profiles_guard_banned before update on public.profiles
for each row execute function public.guard_banned();

create or replace function public.is_banned(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = uid), false);
$$;

-- Suspended people can't post, like, comment, message, request, call or hoot.
create or replace function public.block_banned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.is_banned(auth.uid()) then
    raise exception 'Your account has been suspended for breaking the Terms of Use.' using errcode = 'P0001';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['topics', 'topic_likes', 'topic_comments', 'messages', 'call_requests', 'calls', 'hoots', 'conversations']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_no_banned', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.block_banned()', t || '_no_banned', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Reports queue
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed', 'actioned'));
alter table public.reports add column if not exists handled_at timestamptz;

-- Tell moderators about every new report.
create or replace function public.push_on_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select user_id from public.admins loop
    perform public.send_push(a.user_id, 'New report to review',
      left(new.reason, 120), jsonb_build_object('type', 'report'));
  end loop;
  return new;
end $$;
drop trigger if exists reports_push on public.reports;
create trigger reports_push after insert on public.reports
for each row execute function public.push_on_report();

-- Open reports with what was reported, oldest first.
create or replace function public.admin_list_reports()
returns table (
  id uuid, created_at timestamptz, reason text, reporter text,
  target_user_id uuid, target_username text, target_banned boolean, reports_against_user bigint,
  topic_id uuid, topic_body text, topic_hidden boolean,
  comment_id uuid, comment_body text, call_id uuid
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Moderators only.'; end if;
  return query
  select r.id, r.created_at, r.reason, rp.username,
         coalesce(r.target_user_id, t.user_id, c.user_id) as target_user_id,
         tp.username, coalesce(tp.banned, false),
         (select count(*) from public.reports r2
          left join public.topics t2 on t2.id = r2.topic_id
          where coalesce(r2.target_user_id, t2.user_id) = coalesce(r.target_user_id, t.user_id, c.user_id)),
         r.topic_id, t.body, t.hidden,
         r.comment_id, c.body, r.call_id
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  left join public.topics t on t.id = r.topic_id
  left join public.topic_comments c on c.id = r.comment_id
  left join public.profiles tp on tp.id = coalesce(r.target_user_id, t.user_id, c.user_id)
  where r.status = 'open'
  order by r.created_at asc
  limit 200;
end $$;

-- action: 'dismiss' | 'hide_content' | 'ban_user'
create or replace function public.admin_resolve_report(p_report_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports;
  target uuid;
begin
  if not public.is_admin() then raise exception 'Moderators only.'; end if;
  select * into r from public.reports where id = p_report_id;
  if not found then raise exception 'Report not found.'; end if;
  target := coalesce(r.target_user_id,
                     (select user_id from public.topics where id = r.topic_id),
                     (select user_id from public.topic_comments where id = r.comment_id));

  if p_action = 'dismiss' then
    update public.reports set status = 'dismissed', handled_at = now() where id = r.id;
    return;
  end if;

  if p_action = 'hide_content' then
    if r.topic_id is not null then update public.topics set hidden = true where id = r.topic_id; end if;
    if r.comment_id is not null then delete from public.topic_comments where id = r.comment_id; end if;
  elsif p_action = 'ban_user' then
    if target is null then raise exception 'This report isn’t linked to a person.'; end if;
    update public.profiles set banned = true, open_to_calls = false where id = target;
    update public.topics set hidden = true where user_id = target;
    update public.reports set status = 'actioned', handled_at = now()
    where status = 'open' and (target_user_id = target
      or topic_id in (select id from public.topics where user_id = target));
  else
    raise exception 'Unknown action.';
  end if;
  update public.reports set status = 'actioned', handled_at = now() where id = r.id;
end $$;
