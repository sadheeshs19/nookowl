-- Removes all demo content. Run before launch.
-- Deleting the demo people removes their topics, likes, comments, chats, hoots,
-- requests and calls too (everything cascades from profiles).
delete from public.topics
where user_id = (select id from auth.users where email = 'review1@nooksowl.com')
  and body = 'New here! Looking for book recommendations and good conversations.';
delete from auth.users where email like 'demo+%@nooksowl.com';
select count(*) as demo_people_left from auth.users where email like 'demo+%@nooksowl.com';
