-- Fresh demo call requests for reviewer_vish (review1@nooksowl.com).
-- Requests only last 15 minutes, so run this right before taking the Requests screenshot.
do $$
declare
  me uuid := (select id from auth.users where email = 'review1@nooksowl.com');
begin
  delete from public.call_requests where to_id = me
    and from_id in (select id from auth.users where email like 'demo+%@nooksowl.com');
  insert into public.call_requests (from_id, to_id, note, created_at, expires_at)
  select (select id from public.profiles where username = v.username), me, v.note,
         now() - v.ago, now() - v.ago + interval '15 minutes'
  from (values
    ('leo.dev',      'Would love to hear your book recommendations!', interval '1 minute'),
    ('daniel.chess', 'Quick chat about chess?', interval '2 minutes'),
    ('emma.reads',   'Free for 10 minutes? Want to tell you about my new book', interval '3 minutes'),
    ('maya_travels', 'Just back from Iceland, so many stories 🏔️', interval '4 minutes'),
    ('sofia.k',      'Help me practise my English? 😊', interval '5 minutes'),
    ('noah.cooks',   'Cooking dinner, keep me company?', interval '6 minutes'),
    ('chloe.art',    null, interval '7 minutes')
  ) as v(username, note, ago);
end $$;

select p.username, r.note from public.call_requests r join public.profiles p on p.id = r.from_id
where r.to_id = (select id from auth.users where email = 'review1@nooksowl.com') and r.expires_at > now()
order by r.created_at desc;
