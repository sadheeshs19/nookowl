import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/** Where the magic link sends people back to. Add `nooksowl://**` to Supabase's Redirect URLs. */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

/** Reads `a=1&b=2` pairs from both the query string and the #fragment of a URL. */
function readParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (part: string | undefined) => {
    if (!part) return;
    for (const pair of part.split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  };
  const [beforeHash, hash] = url.split('#');
  add(beforeHash.split('?')[1]);
  add(hash);
  return out;
}

export type MagicLinkResult = { handled: false } | { handled: true; error: string | null };

/**
 * Turns the link from the sign-in email into a signed-in session.
 * Supports both the token-in-fragment link (Supabase's default for apps)
 * and the `?code=` link (if PKCE is ever switched on).
 */
export async function signInFromUrl(url: string | null): Promise<MagicLinkResult> {
  if (!url || !url.includes('auth/callback')) return { handled: false };
  const p = readParams(url);

  if (p.error || p.error_code) {
    const expired = p.error_code === 'otp_expired';
    return {
      handled: true,
      error: expired
        ? 'That sign-in link has expired or was already used. Send yourself a new one.'
        : p.error_description || 'That sign-in link didn’t work. Send yourself a new one.',
    };
  }

  if (p.access_token && p.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
    return { handled: true, error: error ? error.message : null };
  }

  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    return { handled: true, error: error ? error.message : null };
  }

  return { handled: true, error: 'That sign-in link was incomplete. Send yourself a new one.' };
}
