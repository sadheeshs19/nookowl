import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, setCallStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Call } from '../lib/types';
import { useRealtime } from '../lib/useRealtime';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';
import { Avatar, Button, T } from './ui';

/**
 * Lives at the root of the app while signed in:
 * - shows a full-screen incoming call when someone calls you
 * - opens the call when someone accepts your call request
 *
 * Calls only ring while the app is open; push notifications for calls are a later step.
 */
export function CallWatcher() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const me = session?.user.id;
  const [incoming, setIncoming] = useState<{ call: Call; name: string } | null>(null);

  useRealtime(
    'call-watcher',
    me
      ? [
          { table: 'calls', event: 'INSERT', filter: `callee_id=eq.${me}` },
          { table: 'calls', event: 'INSERT', filter: `caller_id=eq.${me}` },
          { table: 'calls', event: 'UPDATE', filter: `callee_id=eq.${me}` },
        ]
      : [],
    async (p) => {
      const call = p.new as Call;
      if (!me) return;
      // Someone is calling me.
      if (p.eventType === 'INSERT' && call.callee_id === me && call.status === 'ringing') {
        const profile = await getProfile(call.caller_id).catch(() => null);
        setIncoming({ call, name: profile?.username ?? 'Someone' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        return;
      }
      // The person I sent a call request to accepted it: join the call.
      if (p.eventType === 'INSERT' && call.caller_id === me && call.status === 'accepted') {
        const profile = await getProfile(call.callee_id).catch(() => null);
        router.push({ pathname: '/call/[id]', params: { id: call.id, name: profile?.username ?? '' } });
        return;
      }
      // The caller gave up before I answered.
      if (p.eventType === 'UPDATE' && call.status !== 'ringing') {
        setIncoming((cur) => (cur && cur.call.id === call.id ? null : cur));
      }
    },
    !!me,
  );

  // Missed after 45 seconds.
  useEffect(() => {
    if (!incoming) return;
    const t = setTimeout(() => setIncoming(null), 45000);
    return () => clearTimeout(t);
  }, [incoming]);

  if (!incoming) return null;

  const answer = async () => {
    const { call, name } = incoming;
    setIncoming(null);
    await setCallStatus(call.id, 'accepted').catch(() => {});
    router.push({ pathname: '/call/[id]', params: { id: call.id, name } });
  };

  const decline = async () => {
    const { call } = incoming;
    setIncoming(null);
    await setCallStatus(call.id, 'declined').catch(() => {});
  };

  return (
    <Modal visible animationType="fade" onRequestClose={decline}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.callBg, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', gap: 14, marginTop: 80 }}>
          <T variant="caps" muted>Incoming call</T>
          <Avatar name={incoming.name} size={120} />
          <T variant="title">{incoming.name}</T>
          <T muted>Answering is always free.</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button kind="danger" title="Decline" style={{ flex: 1, minHeight: 60 }} onPress={decline} icon={<Icon name="hangup" color="#FFFFFF" />} />
          <Button title="Answer" style={{ flex: 1, minHeight: 60, backgroundColor: colors.online }} onPress={answer} icon={<Icon name="phone" color="#FFFFFF" />} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
