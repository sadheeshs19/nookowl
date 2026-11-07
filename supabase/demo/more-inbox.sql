-- More demo chats in reviewer_vish's Inbox (review1@nooksowl.com), so the screen looks full.
do $$
declare
  me uuid := (select id from auth.users where email = 'review1@nooksowl.com');
  c uuid;
  p record;
begin
  for p in select * from (values
    ('noah.cooks',   interval '25 minutes', array['Your ramen tip worked! Added a soft egg 🍜', 'Haha told you. Next up: homemade gyoza?']),
    ('leo.dev',      interval '1 hour 10 minutes', array['That call about switching careers really helped, thanks', 'Anytime! Send me your CV when it''s ready']),
    ('chloe.art',    interval '2 hours', array['Finished the watercolour I told you about 🎨', 'Send a photo! I want to see it']),
    ('daniel.chess', interval '4 hours', array['Rematch tonight? I''ve been practising openings ♟️', 'You''re on. 9pm?']),
    ('sofia.k',      interval '7 hours', array['Learned a new flamenco riff today 🎸', 'Play it for me on our next call!']),
    ('lucas_runs',   interval '1 day', array['Half marathon done! 1:52 🏃', 'Congrats!! That''s amazing'])
  ) as v(username, ago, msgs)
  loop
    -- Reuse an existing chat with this person, or start one.
    select id into c from public.conversations
    where least(user_a, user_b) = least(me, (select id from public.profiles where username = p.username))
      and greatest(user_a, user_b) = greatest(me, (select id from public.profiles where username = p.username))
    limit 1;
    if c is null then
      insert into public.conversations (user_a, user_b, created_by, status, created_at)
      values (me, (select id from public.profiles where username = p.username), me, 'active', now() - p.ago - interval '2 days')
      returning id into c;
    else
      update public.conversations set status = 'active' where id = c;
    end if;
    insert into public.messages (conversation_id, sender_id, body, created_at) values
      (c, (select id from public.profiles where username = p.username), p.msgs[1], now() - p.ago - interval '6 minutes'),
      (c, me, p.msgs[2], now() - p.ago);
    c := null;
  end loop;
end $$;

select p.username, c.status from public.conversations c
join public.profiles p on p.id = case when c.user_a = (select id from auth.users where email = 'review1@nooksowl.com') then c.user_b else c.user_a end
where (select id from auth.users where email = 'review1@nooksowl.com') in (c.user_a, c.user_b)
order by p.username;
