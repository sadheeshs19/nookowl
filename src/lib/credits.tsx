import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { CreditsSheet } from '../components/CreditsSheet';
import { getCredits } from './api';
import { useAuth } from './auth';
import type { Credits } from './types';

type CreditsState = {
  credits: Credits | null;
  refresh: () => Promise<Credits | null>;
  /** Opens the "get more minutes" sheet, optionally with a reason at the top. */
  openSheet: (reason?: string) => void;
  /** Resolves true if the caller can start a call; otherwise opens the sheet. */
  ensureCanCall: () => Promise<boolean>;
};

const CreditsContext = createContext<CreditsState>({
  credits: null,
  refresh: async () => null,
  openSheet: () => {},
  ensureCanCall: async () => true,
});

export const MIN_SECONDS_TO_CALL = 60;

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; reason?: string }>({ open: false });
  const signedIn = !!session && !!profile;

  const refresh = useCallback(async () => {
    if (!signedIn) return null;
    try {
      const c = await getCredits();
      setCredits(c);
      return c;
    } catch {
      return null;
    }
  }, [signedIn]);

  useEffect(() => {
    // Fetch on sign-in and whenever the app comes back to the foreground
    // (the free minutes reset each day).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const openSheet = useCallback((reason?: string) => setSheet({ open: true, reason }), []);

  const ensureCanCall = useCallback(async () => {
    const c = (await refresh()) ?? credits;
    if (c && c.total_seconds < MIN_SECONDS_TO_CALL) {
      openSheet('You’re out of call minutes. Watch a short ad to keep talking, or come back tomorrow for free minutes.');
      return false;
    }
    return true;
  }, [credits, openSheet, refresh]);

  return (
    <CreditsContext.Provider value={{ credits, refresh, openSheet, ensureCanCall }}>
      {children}
      {signedIn ? (
        <CreditsSheet
          visible={sheet.open}
          reason={sheet.reason}
          credits={credits}
          onCredits={setCredits}
          onClose={() => setSheet({ open: false })}
        />
      ) : null}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}

export function minutesText(seconds: number | undefined | null) {
  const m = Math.floor(Math.max(0, seconds ?? 0) / 60);
  return `${m} min`;
}
