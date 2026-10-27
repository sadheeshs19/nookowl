import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

type Change = {
  table: 'messages' | 'calls' | 'call_requests' | 'conversations';
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
};

/**
 * Calls `onChange` whenever rows in the given tables change. Row level security
 * still applies, so each user only hears about rows they can see.
 */
export function useRealtime(key: string, changes: Change[], onChange: (payload: { table: string; new: any; old: any; eventType: string }) => void, enabled = true) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const sig = JSON.stringify(changes);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(`${key}-${Math.random().toString(36).slice(2, 8)}`);
    for (const c of JSON.parse(sig) as Change[]) {
      channel.on(
        'postgres_changes' as any,
        { event: c.event ?? '*', schema: 'public', table: c.table, ...(c.filter ? { filter: c.filter } : {}) },
        (payload: any) => cb.current({ table: c.table, new: payload.new, old: payload.old, eventType: payload.eventType }),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, sig, enabled]);
}
