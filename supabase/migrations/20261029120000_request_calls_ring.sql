-- Accepted call requests now ring the person who sent the request,
-- and call minutes only start counting once that person picks up.

-- true = the caller (who pays) is the one being rung, because the other
-- person accepted their call request.
alter table public.calls add column if not exists rings_caller boolean not null default false;

-- The person who answers this call.
create or replace function public.call_answerer(c public.calls)
returns uuid language sql immutable as $$
  select case when c.rings_caller then c.caller_id else c.callee_id end;
$$;

create or replace function public.calls_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Every call starts ringing; nothing is counted until it's answered.
    new.status := 'ringing';
    new.created_at := now();
    new.accepted_at := null;
    new.ended_at := null;
    return new;
  end if;

  -- Who and where never change.
  new.caller_id := old.caller_id;
  new.callee_id := old.callee_id;
  new.channel := old.channel;
  new.created_at := old.created_at;
  new.rings_caller := old.rings_caller;

  -- A finished call stays finished.
  if old.status in ('ended', 'declined', 'missed') then
    new.status := old.status;
    new.accepted_at := old.accepted_at;
    new.ended_at := old.ended_at;
    return new;
  end if;

  -- Only the person being rung can answer, and an answered call can't ring again.
  if new.status = 'accepted' and old.status = 'ringing'
     and auth.uid() is distinct from public.call_answerer(old) then
    new.status := old.status;
  end if;
  if new.status = 'ringing' and old.status = 'accepted' then
    new.status := old.status;
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

-- Starting a call:
--  * the caller starts it normally (callee is open to calls, or they have an active chat), or
--  * the callee starts it by accepting the caller's call request; it then rings the caller.
drop policy if exists "start calls" on public.calls;
create policy "start calls" on public.calls for insert to authenticated
  with check (
    not public.is_blocked_between(caller_id, callee_id)
    and public.credit_seconds_of(caller_id) >= 60
    and (
      (
        callee_id = auth.uid()
        and rings_caller
        and exists (
          select 1 from public.call_requests r
          where r.from_id = caller_id and r.to_id = callee_id
            and r.status = 'accepted'
            and r.created_at > now() - interval '30 minutes'
        )
      )
      or (
        caller_id = auth.uid()
        and not rings_caller
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

create or replace function public.push_on_call()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rings_caller then
    perform public.send_push(new.caller_id, public.username_of(new.callee_id) || ' accepted your call request',
      'They’re calling you now. Tap to answer.', jsonb_build_object('type', 'call', 'callId', new.id), 'calls');
  else
    perform public.send_push(new.callee_id, public.username_of(new.caller_id) || ' is calling you',
      'Tap to answer. Answering is free.', jsonb_build_object('type', 'call', 'callId', new.id), 'calls');
  end if;
  return new;
end $$;
