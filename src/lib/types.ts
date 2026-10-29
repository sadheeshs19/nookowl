export type Profile = {
  id: string;
  username: string;
  birth_year: number;
  city: string | null;
  bio: string | null;
  languages: string[];
  interests: string[];
  open_to_calls: boolean;
  avatar_path: string | null;
  cover_path: string | null;
  created_at: string;
};

export type FeedTopic = {
  id: string;
  body: string;
  tags: string[];
  created_at: string;
  user_id: string;
  username: string;
  avatar_path: string | null;
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
  author: { username: string; avatar_path: string | null } | null;
};

export type CallRequest = {
  id: string;
  from_id: string;
  to_id: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  expires_at: string;
  from_profile: { username: string; avatar_path: string | null } | null;
  to_profile: { username: string; avatar_path: string | null } | null;
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
  /** true when an accepted call request rings the person who sent it. */
  rings_caller: boolean;
};

/** The person who has to pick up this call. */
export const answererOf = (c: Pick<Call, 'rings_caller' | 'caller_id' | 'callee_id'>) =>
  c.rings_caller ? c.caller_id : c.callee_id;
/** The person waiting for the other to pick up. */
export const dialerOf = (c: Pick<Call, 'rings_caller' | 'caller_id' | 'callee_id'>) =>
  c.rings_caller ? c.callee_id : c.caller_id;

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
  other: { id: string; username: string; avatar_path: string | null };
  last: Message | null;
};

export type Credits = {
  free_seconds: number;
  bonus_seconds: number;
  total_seconds: number;
  ads_today: number;
  ads_left: number;
  ad_seconds: number;
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
