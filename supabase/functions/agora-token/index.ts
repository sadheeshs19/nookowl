// Supabase Edge Function: returns an Agora RTC token for a call or voice room the
// signed-in user is part of. Deploy with:
//   supabase secrets set AGORA_APP_ID=... AGORA_APP_CERTIFICATE=...
//   supabase functions deploy agora-token
import { createClient } from 'npm:@supabase/supabase-js@2';
import { RtcRole, RtcTokenBuilder } from 'npm:agora-token@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const appId = Deno.env.get('AGORA_APP_ID');
  const certificate = Deno.env.get('AGORA_APP_CERTIFICATE');
  if (!appId || !certificate) return json({ error: 'Agora is not configured' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth } = await supabase.auth.getUser(jwt);
  if (!auth.user) return json({ error: 'Not signed in' }, 401);

  const body = await req.json().catch(() => ({}));
  const { callId, roomId } = body as { callId?: string; roomId?: string };

  // Voice rooms: speakers (and the host) may talk, everyone else only listens.
  // The role and the numeric uid come from the database, never from the app.
  if (roomId) {
    const { data: room } = await supabase.from('rooms').select('id, status').eq('id', roomId).maybeSingle();
    if (!room) return json({ error: 'Room not found' }, 404);
    if (room.status !== 'live') return json({ error: 'This room has ended' }, 410);
    const { data: member } = await supabase
      .from('room_members')
      .select('role, agora_uid, left_at, muted_by_host')
      .eq('room_id', roomId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (!member || member.left_at) return json({ error: 'Join the room first' }, 403);
    const speaker = member.role === 'host' || (member.role === 'speaker' && !member.muted_by_host);
    const expire = 3600;
    const channel = `room_${room.id}`;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      channel,
      member.agora_uid,
      speaker ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      expire,
      expire,
    );
    return json({ token, channel, appId, uid: member.agora_uid, role: member.role, canSpeak: speaker });
  }

  if (!callId) return json({ error: 'callId is required' }, 400);

  // Row level security only returns calls this user is part of.
  const { data: call, error } = await supabase
    .from('calls')
    .select('id, channel, status, caller_id, callee_id')
    .eq('id', callId)
    .maybeSingle();
  if (error || !call) return json({ error: 'Call not found' }, 404);
  if (call.status === 'ended' || call.status === 'declined' || call.status === 'missed') {
    return json({ error: 'Call is over' }, 410);
  }

  // The call may last as long as the caller has minutes (max one hour per token).
  // When the token expires, Agora removes both people from the call.
  const { data: allowed } = await supabase.rpc('call_seconds_allowed', { p_call_id: callId });
  const secondsLeft = typeof allowed === 'number' ? allowed : 0;
  if (secondsLeft < 15) return json({ error: 'The caller is out of call minutes' }, 402);
  const expireSeconds = Math.min(3600, secondsLeft + 15);

  // uid 0 lets Agora assign the numeric id.
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    call.channel,
    0,
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds,
  );

  return json({ token, channel: call.channel, appId, secondsLeft });
});
