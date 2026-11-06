-- Gives the 8 demo people international names, cities and languages, and
-- makes their topics and chats match. Only touches demo accounts (demo+...@nooksowl.com).
with m(old, new, city, bio, langs, interests) as (values
  ('meera.reads',  'emma.reads',   'London',   'Bookworm and tea person. Ask me what I am reading.',              array['English'],            array['Books','Tea']),
  ('arjun_runs',   'lucas_runs',   'Berlin',   'Marathon training at 5am. Talk to me about running or startups.',  array['English','German'],   array['Running','Startups']),
  ('priya.k',      'sofia.k',      'Madrid',   'Learning guitar badly. Flamenco fan.',                             array['English','Spanish'],  array['Music','Guitar']),
  ('rohan.cooks',  'noah.cooks',   'Toronto',  'I cook, you tell me what to cook next.',                           array['English','French'],   array['Cooking','Food']),
  ('sana_travels', 'maya_travels', 'Sydney',   'Solo trips, mountains, and bad sunset photos.',                    array['English'],            array['Travel','Photography']),
  ('kabir.dev',    'leo.dev',      'New York', 'Software engineer. Night owl. Happy to help with code or careers.', array['English'],           array['Tech','Careers']),
  ('ananya.art',   'chloe.art',    'Paris',    'Watercolours and long walks. French films forever.',               array['English','French'],   array['Art','Movies']),
  ('vikram.chess', 'daniel.chess', 'Dublin',   'Chess, history and good conversations.',                           array['English'],            array['Chess','History'])
)
update public.profiles p
set username = m.new, city = m.city, bio = m.bio, languages = m.langs, interests = m.interests
from m, auth.users u
where p.username = m.old and u.id = p.id and u.email like 'demo+%@nooksowl.com';

update public.topics t set body = 'Made ramen from scratch for the first time. It was edible! Share your best cooking fail.', tags = array['cooking','food']
where t.user_id = (select id from public.profiles where username = 'noah.cooks') and t.body like 'Made biryani%';

update public.topics t set body = 'Planning a solo trip to Iceland. Has anyone been? Tell me everything.'
where t.user_id = (select id from public.profiles where username = 'maya_travels') and t.body like '%Spiti%';

update public.messages set body = 'Sending you the Iceland photos I promised 🏔️'
where body like '%Spiti photos%';

update public.messages set body = 'Re-reading Pride and Prejudice, no shame 😄 Free for a quick call later?'
where body like 'Re-reading Harry Potter%';

select username, city, languages from public.profiles p join auth.users u on u.id = p.id
where u.email like 'demo+%@nooksowl.com' order by username;
