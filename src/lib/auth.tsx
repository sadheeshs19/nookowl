import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getProfile } from './api';
import { signInFromUrl } from './magicLink';
import { isConfigured, supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Set when a sign-in link was opened but didn't work (expired, already used…). */
  linkError: string | null;
  clearLinkError: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  session: null,
  profile: null,
  linkError: null,
  clearLinkError: () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await getProfile(s.user.id));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    // Load the profile first and only then publish the new session, so screens never
    // see "signed in but no profile" for a moment and send people to profile setup.
    // (Deferred with setTimeout: Supabase calls made inside this callback can stall.)
    let latest = 0;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const run = ++latest;
      setTimeout(async () => {
        if (!s) {
          if (run !== latest) return;
          setProfile(null);
          setSession(null);
          return;
        }
        try {
          const p = await getProfile(s.user.id);
          if (run !== latest) return;
          setProfile(p);
        } catch {
          // Network hiccup: keep the profile we already have for this person.
          if (run !== latest) return;
          setProfile((prev) => (prev?.id === s.user.id ? prev : null));
        }
        setSession(s);
      }, 0);
    });

    const handleUrl = async (url: string | null) => {
      const res = await signInFromUrl(url);
      if (res.handled) setLinkError(res.error);
    };

    // App opened by tapping the email link while it was closed…
    (async () => {
      await handleUrl(await Linking.getInitialURL());
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
    })();

    // …or while it was already running in the background.
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [loadProfile]);

  const value: AuthState = {
    ready,
    session,
    profile,
    linkError,
    clearLinkError: () => setLinkError(null),
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      // Try to end the session on the server too, but never let a slow or failed
      // request keep someone signed in on this device.
      await Promise.race([
        supabase.auth.signOut().catch(() => {}),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setSession(null);
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
