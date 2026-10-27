// Supabase Edge Function: returns an Agora RTC token for a call the signed-in
// user is part of. Deploy with:
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'Not signed in' }, 401);

  const { callId } = await req.json().catch(() => ({ callId: null }));
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

  // uid 0 lets Agora assign the numeric id; the token is valid for one hour.
  const expireSeconds = 3600;
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    certificate,
    call.channel,
    0,
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds,
  );

  return json({ token, channel: call.channel, appId });
});
