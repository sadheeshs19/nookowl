-- Gender shown on profiles, plus "Who can call me" so people control who reaches them.

alter table public.profiles add column if not exists gender text
  check (gender in ('woman', 'man', 'nonbinary', 'unspecified'));
alter table public.profiles add column if not exists who_can_call text not null default 'everyone'
  check (who_can_call in ('everyone', 'women', 'chatted'));

-- May `caller` send call requests to, or call, `callee`?
-- People with an active chat can always call each other.
create or replace function public.can_call(caller uuid, callee uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.active_conversation_between(caller, callee) is not null
    or exists (
      select 1 from public.profiles p
      where p.id = callee
        and (
          p.who_can_call = 'everyone'
          or (p.who_can_call = 'women'
              and (select gender from public.profiles where id = caller) = 'woman')
        )
    );
$$;

-- Starting a call: same rules as before, plus the callee's "Who can call me".
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
        and public.can_call(caller_id, callee_id)
        and (
          exists (select 1 from public.profiles p where p.id = callee_id and p.open_to_calls)
          or public.active_conversation_between(caller_id, callee_id) is not null
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
    and public.can_call(from_id, to_id)
  );

-- People list: only those open to calls who would accept a call from me.
create or replace function public.get_people_for_me()
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select p.* from public.profiles p
  where p.open_to_calls
    and not p.banned
    and p.id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), p.id)
    and public.can_call(auth.uid(), p.id)
  order by p.created_at desc
  limit 50;
$$;
