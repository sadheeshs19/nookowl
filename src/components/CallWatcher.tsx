import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findRingingCallForMe, getCall, getProfile, setCallStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { registerForPush, type PushData } from '../lib/push';
import { answererOf, dialerOf, type Call } from '../lib/types';
import { useRealtime } from '../lib/useRealtime';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';
import { Avatar, Button, T } from './ui';

/**
 * Lives at the root of the app while signed in:
 * - shows a full-screen incoming call when someone calls you
 * - rings you when someone accepts your call request
 * - registers for push notifications and opens the right screen when one is tapped
 * - when the app is opened from a call notification, picks up the ringing call
 */
export function CallWatcher() {
  const { session, profile } = useAuth();
  const { colors } = useTheme();
  const me = session?.user.id;
  const [incoming, setIncoming] = useState<{ call: Call; name: string; avatar: string | null } | null>(null);
  const handledResponse = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  const showIncoming = useCallback(async (call: Call) => {
    const p = await getProfile(dialerOf(call)).catch(() => null);
    setIncoming({ call, name: p?.username ?? 'Someone', avatar: p?.avatar_path ?? null });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  // Register this device for push once signed in with a profile.
  useEffect(() => {
    if (me && profile) registerForPush();
  }, [me, profile]);

  // Opening the app (or bringing it back) while someone is ringing us.
  useEffect(() => {
    if (!me || !profile) return;
    const check = () => {
      findRingingCallForMe()
        .then((c) => {
          if (c) showIncoming(c);
        })
        .catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [me, profile, showIncoming]);

  // A notification was tapped.
  useEffect(() => {
    if (!me || !profile || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    const data = lastResponse.notification.request.content.data as Partial<PushData> | undefined;
    if ((data?.type === 'message' || data?.type === 'hoot') && data.conversationId) {
      router.push({ pathname: '/chat/[id]', params: { id: data.conversationId } });
    } else if (data?.type === 'report') {
      router.push('/admin');
    } else if (data?.type === 'request') {
      router.navigate('/(tabs)/requests');
    } else if (data?.type === 'call' && data.callId) {
      getCall(data.callId)
        .then((c) => {
          if (!c) return;
          if (c.status === 'ringing' && answererOf(c) === me) showIncoming(c);
        })
        .catch(() => {});
    }
  }, [lastResponse, me, profile, showIncoming]);

  useRealtime(
    'call-watcher',
    me
      ? [
          { table: 'calls', event: 'INSERT', filter: `callee_id=eq.${me}` },
          { table: 'calls', event: 'INSERT', filter: `caller_id=eq.${me}` },
          { table: 'calls', event: 'UPDATE', filter: `callee_id=eq.${me}` },
          { table: 'calls', event: 'UPDATE', filter: `caller_id=eq.${me}` },
        ]
      : [],
    async (p) => {
      const call = p.new as Call;
      if (!me) return;
      // Someone is calling me, or accepted my call request and is ringing me.
      if (p.eventType === 'INSERT' && answererOf(call) === me && call.status === 'ringing') {
        showIncoming(call);
        return;
      }
      // They gave up before I answered.
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
          <T variant="caps" muted>{incoming.call.rings_caller ? 'Accepted your call request' : 'Incoming call'}</T>
          <Avatar name={incoming.name} path={incoming.avatar} size={120} />
          <T variant="title">{incoming.name}</T>
          <T muted style={{ textAlign: 'center' }}>
            {incoming.call.rings_caller
              ? 'Your call minutes start once you answer.'
              : 'Answering is always free.'}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button kind="danger" title="Decline" style={{ flex: 1, minHeight: 60 }} onPress={decline} icon={<Icon name="hangup" color="#FFFFFF" />} />
          <Button title="Answer" style={{ flex: 1, minHeight: 60, backgroundColor: colors.online }} onPress={answer} icon={<Icon name="phone" color="#FFFFFF" />} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
