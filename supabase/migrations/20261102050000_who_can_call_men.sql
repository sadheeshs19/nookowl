-- "Who can call me" gets a Men option: Everyone / Women / Men / Chats.

alter table public.profiles drop constraint if exists profiles_who_can_call_check;
alter table public.profiles add constraint profiles_who_can_call_check
  check (who_can_call in ('everyone', 'women', 'men', 'chatted'));

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
          or (p.who_can_call = 'men'
              and (select gender from public.profiles where id = caller) = 'man')
        )
    );
$$;
