-- Demo content for store screenshots. Remove it before launch with remove-demo.sql.
-- Demo people can't sign in (no password). Their emails are demo+<name>@nooksowl.com.
-- The screenshots are taken signed in as review1@nooksowl.com.

do $$
declare
  me uuid := (select id from auth.users where email = 'review1@nooksowl.com');
  p record;
  ids uuid[] := '{}';
  t uuid;
  c uuid;
begin
  if me is null then raise exception 'Create review1@nooksowl.com first.'; end if;

  -- People
  for p in select * from (values
    ('meera.reads', 1997, 'Pune',      'woman', 'Bookworm and chai person. Ask me what I am reading.', array['English','Hindi','Marathi'], array['Books','Chai']),
    ('arjun_runs',  1993, 'Bengaluru', 'man',   'Marathon training at 5am. Talk to me about running or startups.', array['English','Kannada'], array['Running','Startups']),
    ('priya.k',     1999, 'Chennai',   'woman', 'Learning guitar badly. Carnatic music fan.', array['English','Tamil'], array['Music','Guitar']),
    ('rohan.cooks', 1995, 'Delhi',     'man',   'I cook, you tell me what to cook next.', array['English','Hindi','Punjabi'], array['Cooking','Food']),
    ('sana_travels',1996, 'Hyderabad', 'woman', 'Solo trips, mountains, and bad sunsets photos.', array['English','Urdu','Telugu'], array['Travel','Photography']),
    ('kabir.dev',   1992, 'Mumbai',    'man',   'Software engineer. Night owl. Happy to help with code or careers.', array['English','Hindi'], array['Tech','Careers']),
    ('ananya.art',  1998, 'Kolkata',   'woman', 'Watercolours and long walks. Bengali films forever.', array['English','Bengali'], array['Art','Movies']),
    ('vikram.chess',1990, 'Jaipur',    'man',   'Chess, history and good conversations.', array['English','Hindi'], array['Chess','History'])
  ) as v(username, birth_year, city, gender, bio, languages, interests)
  loop
    t := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (t, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'demo+' || replace(p.username, '.', '_') || '@nooksowl.com',
            '{"provider":"email","providers":["email"]}', '{}', now(), now());
    insert into public.profiles (id, username, birth_year, city, bio, languages, interests, gender, who_can_call, open_to_calls)
    values (t, p.username, p.birth_year, p.city, p.bio, p.languages, p.interests, p.gender, 'everyone', true);
    ids := ids || t;
  end loop;

  -- Topics, spread over the last few hours
  insert into public.topics (user_id, body, tags, created_at) values
    (ids[1], 'Just finished The Midnight Library. Anyone want to talk about regrets and second chances?', array['books'], now() - interval '12 minutes'),
    (ids[2], 'First half marathon this Sunday and I am nervous. Runners, any last-minute advice?', array['running','fitness'], now() - interval '35 minutes'),
    (ids[3], 'Can''t sleep. Up for a calm chat about anything except work.', array['nightowls'], now() - interval '50 minutes'),
    (ids[4], 'Made biryani for the first time. It was edible! Share your best cooking fail.', array['cooking','food'], now() - interval '1 hour 20 minutes'),
    (ids[5], 'Planning a solo trip to Spiti. Has anyone been? Tell me everything.', array['travel'], now() - interval '2 hours'),
    (ids[6], 'Switching careers into tech at 30. Happy to share what worked for me.', array['careers','tech'], now() - interval '3 hours'),
    (ids[7], 'Practising my English speaking. Looking for a friendly 10-minute chat.', array['english','language'], now() - interval '4 hours'),
    (ids[8], 'Who wants to argue about the greatest chess player of all time?', array['chess'], now() - interval '5 hours');

  -- Likes and comments
  insert into public.topic_likes (topic_id, user_id)
  select tp.id, u from public.topics tp cross join unnest(ids) u
  where tp.user_id = any(ids) and tp.user_id <> u and random() < 0.5
  on conflict do nothing;

  select id into t from public.topics where user_id = ids[2] order by created_at desc limit 1;
  insert into public.topic_comments (topic_id, user_id, body, created_at) values
    (t, ids[6], 'Don''t try anything new on race day. Same shoes, same breakfast!', now() - interval '20 minutes'),
    (t, ids[5], 'Good luck! Start slower than you think.', now() - interval '15 minutes');
  select id into t from public.topics where user_id = ids[1] order by created_at desc limit 1;
  insert into public.topic_comments (topic_id, user_id, body, created_at) values
    (t, ids[7], 'Loved that book. The library scenes!', now() - interval '5 minutes');

  -- A topic from the reviewer account, so My topics isn't empty
  insert into public.topics (user_id, body, tags, created_at)
  values (me, 'New here! Looking for book recommendations and good conversations.', array['books','hello'], now() - interval '25 minutes');

  -- Chats with the reviewer account
  insert into public.conversations (user_a, user_b, created_by, status, created_at)
  values (me, ids[1], ids[1], 'active', now() - interval '1 day') returning id into c;
  insert into public.messages (conversation_id, sender_id, body, created_at) values
    (c, ids[1], 'Hey! Loved your topic about books. What are you reading right now?', now() - interval '50 minutes'),
    (c, me,     'Just started Sapiens. You?', now() - interval '45 minutes'),
    (c, ids[1], 'Re-reading Harry Potter, no shame 😄 Free for a quick call later?', now() - interval '40 minutes'),
    (c, me,     'Sure, ping me in the evening!', now() - interval '38 minutes');

  insert into public.conversations (user_a, user_b, created_by, status, created_at)
  values (me, ids[2], me, 'active', now() - interval '2 days') returning id into c;
  insert into public.messages (conversation_id, sender_id, body, created_at) values
    (c, me,     'Thanks for the running tips yesterday!', now() - interval '3 hours'),
    (c, ids[2], 'Anytime. How did the 10k go?', now() - interval '2 hours 50 minutes');

  insert into public.conversations (user_a, user_b, created_by, status, created_at)
  values (me, ids[5], ids[5], 'active', now() - interval '3 days') returning id into c;
  insert into public.messages (conversation_id, sender_id, body, created_at) values
    (c, ids[5], 'Sending you the Spiti photos I promised 🏔️', now() - interval '6 hours');

  -- A message request waiting for the reviewer
  insert into public.conversations (user_a, user_b, created_by, status, created_at)
  values (ids[3], me, ids[3], 'request', now() - interval '30 minutes') returning id into c;
  insert into public.messages (conversation_id, sender_id, body, created_at)
  values (c, ids[3], 'Hi! Saw you like books too. Would love to chat sometime.', now() - interval '30 minutes');

  -- Hoots at the reviewer
  insert into public.hoots (from_id, to_id, created_at) values
    (ids[1], me, now() - interval '8 minutes'),
    (ids[5], me, now() - interval '1 hour');

  -- Call requests to the reviewer (stay visible for a day)
  insert into public.call_requests (from_id, to_id, note, created_at, expires_at) values
    (ids[6], me, 'Would love to hear your book recommendations!', now() - interval '3 minutes', now() + interval '1 day'),
    (ids[8], me, 'Quick chat about chess?', now() - interval '10 minutes', now() + interval '1 day');

  -- A few finished calls so the call history looks real
  insert into public.calls (caller_id, callee_id, status, created_at, accepted_at, ended_at, caller_rating, callee_rating) values
    (ids[1], me, 'ended', now() - interval '1 day', now() - interval '1 day', now() - interval '1 day' + interval '12 minutes', 5, 5),
    (me, ids[2], 'ended', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days' + interval '8 minutes', 5, 4);
end $$;
