export type Profile = {
  id: string;
  username: string;
  birth_year: number;
  city: string | null;
  bio: string | null;
  languages: string[];
  interests: string[];
  open_to_calls: boolean;
  created_at: string;
};

export type FeedTopic = {
  id: string;
  body: string;
  tags: string[];
  created_at: string;
  user_id: string;
  username: string;
  city: string | null;
  languages: string[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  last_comment_username: string | null;
  last_comment_body: string | null;
};

export type TopicComment = {
  id: string;
  topic_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { username: string } | null;
};

export type CallRequest = {
  id: string;
  from_id: string;
  to_id: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  expires_at: string;
  from_profile: { username: string } | null;
  to_profile: { username: string } | null;
};

export type Call = {
  id: string;
  caller_id: string;
  callee_id: string;
  channel: string;
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended';
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
};

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  created_by: string;
  status: 'request' | 'active' | 'ignored';
  created_at: string;
  last_message_at: string;
};

export type ConversationListItem = Conversation & {
  other: { id: string; username: string };
  last: Message | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  audio_ms: number | null;
  created_at: string;
};
