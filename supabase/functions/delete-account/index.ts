// Supabase Edge Function: permanently deletes the signed-in person's account.
// Removes their profile pictures and voice notes, then the login itself.
// Everything else (profile, topics, likes, comments, chats, calls, hoots,
// minutes, push tokens) is removed by the database's "on delete cascade".
// Deploy with: supabase functions deploy delete-account  (Verify JWT can stay off;
// the function checks the login itself.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** The project's admin key. Newer projects expose it as SUPABASE_SECRET_KEYS. */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, serviceKey(), { auth: { persistSession: false } });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(jwt);
  const uid = auth.user?.id;
  if (!uid) return json({ error: 'Not signed in' }, 401);

  // Profile pictures and cover images.
  const { data: images } = await admin.storage.from('profile-images').list(uid, { limit: 1000 });
  if (images?.length) {
    await admin.storage.from('profile-images').remove(images.map((f) => `${uid}/${f.name}`));
  }

  // Voice notes they sent.
  const { data: notes } = await admin.from('messages').select('audio_path').eq('sender_id', uid).not('audio_path', 'is', null);
  const paths = (notes ?? []).map((n) => n.audio_path as string).filter(Boolean);
  for (let i = 0; i < paths.length; i += 500) {
    await admin.storage.from('voice-notes').remove(paths.slice(i, i + 500));
  }

  // The login. Cascades to the profile and everything linked to it.
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return json({ error: error.message }, 500);
  return json({ deleted: true });
});
