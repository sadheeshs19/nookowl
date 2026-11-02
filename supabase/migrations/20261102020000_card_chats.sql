-- People can turn off the "Chat" button on their card in People.
-- (Messaging from a topic someone posted still works.)
alter table public.profiles add column if not exists allow_card_chats boolean not null default true;
