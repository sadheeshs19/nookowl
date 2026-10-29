import { supabase } from './supabase';
import type {
  Call,
  CallRequest,
  Conversation,
  Credits,
  ConversationListItem,
  FeedTopic,
  Message,
  Profile,
  TopicComment,
} from './types';

async function me(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------------------------------------------------------------- profiles
export async function getProfile(id: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;
}

export async function saveProfile(p: Omit<Profile, 'created_at'>) {
  check(await supabase.from('profiles').upsert(p));
}

export async function setOpenToCalls(open: boolean) {
  const id = await me();
  check(await supabase.from('profiles').update({ open_to_calls: open }).eq('id', id));
}

export async function isUsernameTaken(username: string, exceptId?: string) {
  const rows = check(
    await supabase.from('profiles').select('id').ilike('username', username).limit(1),
  ) as { id: string }[];
  return rows.some((r) => r.id !== exceptId);
}

// ---------------------------------------------------------------- topics
export async function getFeed(q?: string, onlyUser?: string): Promise<FeedTopic[]> {
  return check(
    await supabase.rpc('get_topic_feed', { q: q?.trim() || null, only_user: onlyUser ?? null }),
  ) as FeedTopic[];
}

export async function getTrendingTags(): Promise<string[]> {
  const rows = check(await supabase.rpc('get_trending_tags')) as { tag: string }[];
  return rows.map((r) => r.tag);
}

export async function postTopic(body: string, tags: string[]) {
  const user_id = await me();
  check(await supabase.from('topics').insert({ user_id, body: body.trim(), tags }));
}

export async function deleteTopic(id: string) {
  check(await supabase.from('topics').delete().eq('id', id));
}

export async function setLiked(topicId: string, liked: boolean) {
  const user_id = await me();
  if (liked) {
    check(await supabase.from('topic_likes').upsert({ topic_id: topicId, user_id }));
  } else {
    check(await supabase.from('topic_likes').delete().eq('topic_id', topicId).eq('user_id', user_id));
  }
}

export async function getComments(topicId: string): Promise<TopicComment[]> {
  return check(
    await supabase
      .from('topic_comments')
      .select('*, author:profiles!topic_comments_user_id_fkey(username)')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true }),
  ) as TopicComment[];
}

export async function addComment(topicId: string, body: string) {
  const user_id = await me();
  check(await supabase.from('topic_comments').insert({ topic_id: topicId, user_id, body: body.trim() }));
}

// ---------------------------------------------------------------- people
export async function getPeopleOpenToCalls(): Promise<Profile[]> {
  const id = await me();
  return check(
    await supabase
      .from('profiles')
      .select('*')
      .eq('open_to_calls', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ) as Profile[];
}

// ---------------------------------------------------------------- call requests
export async function sendCallRequest(toId: string, note?: string) {
  const from_id = await me();
  check(await supabase.from('call_requests').insert({ from_id, to_id: toId, note: note?.trim() || null }));
}

export async function getCallRequests(): Promise<{ received: CallRequest[]; sent: CallRequest[] }> {
  const id = await me();
  const rows = check(
    await supabase
      .from('call_requests')
      .select(
        '*, from_profile:profiles!call_requests_from_id_fkey(username), to_profile:profiles!call_requests_to_id_fkey(username)',
      )
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .or(`from_id.eq.${id},to_id.eq.${id}`)
      .order('created_at', { ascending: false }),
  ) as CallRequest[];
  return {
    received: rows.filter((r) => r.to_id === id),
    sent: rows.filter((r) => r.from_id === id),
  };
}

export async function declineCallRequest(id: string) {
  check(await supabase.from('call_requests').update({ status: 'declined' }).eq('id', id));
}

export async function cancelCallRequest(id: string) {
  check(await supabase.from('call_requests').update({ status: 'cancelled' }).eq('id', id));
}

/** Accepting a request starts the call right away; the requester is the caller. */
export async function acceptCallRequest(req: CallRequest): Promise<Call> {
  const id = await me();
  check(await supabase.from('call_requests').update({ status: 'accepted' }).eq('id', req.id));
  return check(
    await supabase
      .from('calls')
      .insert({ caller_id: req.from_id, callee_id: id, status: 'accepted', accepted_at: new Date().toISOString() })
      .select('*')
      .single(),
  ) as Call;
}

// ---------------------------------------------------------------- calls
export async function startCall(calleeId: string): Promise<Call> {
  const caller_id = await me();
  return check(
    await supabase.from('calls').insert({ caller_id, callee_id: calleeId }).select('*').single(),
  ) as Call;
}

export async function getCall(id: string): Promise<Call | null> {
  return check(await supabase.from('calls').select('*').eq('id', id).maybeSingle()) as Call | null;
}

export async function setCallStatus(id: string, status: Call['status']) {
  const patch: Partial<Call> = { status };
  if (status === 'accepted') patch.accepted_at = new Date().toISOString();
  if (status === 'ended' || status === 'declined' || status === 'missed') patch.ended_at = new Date().toISOString();
  check(await supabase.from('calls').update(patch).eq('id', id));
}

export async function rateCall(call: Call, rating: number) {
  const id = await me();
  const field = call.caller_id === id ? 'caller_rating' : 'callee_rating';
  check(await supabase.from('calls').update({ [field]: rating }).eq('id', call.id));
}

export async function getAgoraToken(
  callId: string,
): Promise<{ token: string; channel: string; appId: string; secondsLeft: number }> {
  const { data, error } = await supabase.functions.invoke('agora-token', { body: { callId } });
  if (error) {
    // The function explains what went wrong in its JSON body.
    const ctx = (error as { context?: Response }).context;
    const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(body?.error ?? error.message);
  }
  return data as { token: string; channel: string; appId: string; secondsLeft: number };
}

// ---------------------------------------------------------------- credits
export async function getCredits(): Promise<Credits> {
  const rows = check(await supabase.rpc('get_credits')) as Credits[];
  return rows[0];
}

export async function claimAdReward(): Promise<Credits> {
  const rows = check(await supabase.rpc('claim_ad_reward')) as Credits[];
  return rows[0];
}

// ---------------------------------------------------------------- push
export async function savePushToken(token: string) {
  const user_id = await me();
  check(await supabase.from('push_tokens').upsert({ user_id, token, updated_at: new Date().toISOString() }));
}

export async function deletePushToken() {
  const user_id = await me();
  check(await supabase.from('push_tokens').delete().eq('user_id', user_id));
}

export async function findRingingCallForMe(): Promise<Call | null> {
  const id = await me();
  const since = new Date(Date.now() - 45000).toISOString();
  const rows = check(
    await supabase
      .from('calls')
      .select('*')
      .eq('callee_id', id)
      .eq('status', 'ringing')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1),
  ) as Call[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------- conversations
export async function findConversation(otherId: string): Promise<Conversation | null> {
  const id = await me();
  const rows = check(
    await supabase
      .from('conversations')
      .select('*')
      .or(`and(user_a.eq.${id},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${id})`)
      .limit(1),
  ) as Conversation[];
  return rows[0] ?? null;
}

export async function getOrStartConversation(otherId: string): Promise<Conversation> {
  const existing = await findConversation(otherId);
  if (existing) return existing;
  const id = await me();
  return check(
    await supabase
      .from('conversations')
      .insert({ user_a: id, user_b: otherId, created_by: id })
      .select('*')
      .single(),
  ) as Conversation;
}

/** After a good call, both people chose to stay in touch: the chat is active right away. */
export async function activateConversationWith(otherId: string): Promise<Conversation> {
  const conv = await getOrStartConversation(otherId);
  if (conv.status !== 'active') {
    check(await supabase.from('conversations').update({ status: 'active' }).eq('id', conv.id));
  }
  return { ...conv, status: 'active' };
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return check(await supabase.from('conversations').select('*').eq('id', id).maybeSingle()) as Conversation | null;
}

export async function setConversationStatus(id: string, status: Conversation['status']) {
  check(await supabase.from('conversations').update({ status }).eq('id', id));
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const id = await me();
  const rows = check(
    await supabase
      .from('conversations')
      .select(
        '*, a:profiles!conversations_user_a_fkey(id, username), b:profiles!conversations_user_b_fkey(id, username), messages(id, conversation_id, sender_id, body, audio_path, audio_ms, created_at)',
      )
      .neq('status', 'ignored')
      .order('last_message_at', { ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(1, { referencedTable: 'messages' }),
  ) as (Conversation & {
    a: { id: string; username: string };
    b: { id: string; username: string };
    messages: Message[];
  })[];
  return rows.map(({ a, b, messages, ...c }) => ({
    ...c,
    other: a.id === id ? b : a,
    last: messages[0] ?? null,
  }));
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return check(
    await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200),
  ) as Message[];
}

export async function sendText(conversationId: string, body: string) {
  const sender_id = await me();
  check(await supabase.from('messages').insert({ conversation_id: conversationId, sender_id, body: body.trim() }));
}

export async function sendVoiceNote(conversationId: string, fileUri: string, durationMs: number) {
  const sender_id = await me();
  const bytes = await (await fetch(fileUri)).arrayBuffer();
  const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.m4a`;
  const up = await supabase.storage.from('voice-notes').upload(path, bytes, { contentType: 'audio/mp4' });
  if (up.error) throw new Error(up.error.message);
  check(
    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id, audio_path: path, audio_ms: Math.round(durationMs) }),
  );
}

export async function voiceNoteUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('voice-notes').createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ---------------------------------------------------------------- safety
export async function report(target: { userId?: string; topicId?: string; callId?: string }, reason: string) {
  const reporter_id = await me();
  check(
    await supabase.from('reports').insert({
      reporter_id,
      target_user_id: target.userId ?? null,
      topic_id: target.topicId ?? null,
      call_id: target.callId ?? null,
      reason,
    }),
  );
}

export async function block(userId: string) {
  const blocker_id = await me();
  check(await supabase.from('blocks').upsert({ blocker_id, blocked_id: userId }));
}
