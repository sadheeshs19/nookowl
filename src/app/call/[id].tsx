import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/icons';
import { Avatar, Button, T } from '../../components/ui';
import { activateConversationWith, getCall, getProfile, rateCall, report, setCallStatus } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { clock } from '../../lib/format';
import { dialerOf, type Call, type Profile } from '../../lib/types';
import { useCredits } from '../../lib/credits';
import { useAgoraCall } from '../../lib/useAgoraCall';
import { useRealtime } from '../../lib/useRealtime';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

const PROMPTS = [
  'What’s the best thing that happened to you this week?',
  'What’s a place you’d love to visit, and why?',
  'What are you really good at that most people don’t know?',
  'What’s a small thing that always makes your day better?',
  'What did you want to be when you were a kid?',
  'What’s a song you can’t stop listening to lately?',
];

const RING_TIMEOUT_MS = 45000;

export default function CallScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const me = session?.user.id;
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [call, setCall] = useState<Call | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [prompt, setPrompt] = useState(0);
  const [endedHere, setEndedHere] = useState(false);
  // The call is over once either side ends it.
  const phase: 'live' | 'after' = endedHere || call?.status === 'ended' ? 'after' : 'live';
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!id || !me) return;
    getCall(id).then(async (c) => {
      if (!c) return;
      setCall(c);
      setOther(await getProfile(c.caller_id === me ? c.callee_id : c.caller_id));
    });
  }, [id, me]);

  useRealtime(
    `call-${id}`,
    [{ table: 'calls', event: 'UPDATE', filter: `id=eq.${id}` }],
    (p) => setCall(p.new as Call),
    !!id,
  );

  const finish = useCallback(async () => {
    if (!id) return;
    setEndedHere(true);
    await setCallStatus(id, 'ended').catch(() => {});
  }, [id]);

  const accepted = call?.status === 'accepted';
  const agora = useAgoraCall(id, accepted && phase === 'live', finish);
  const { refresh: refreshCredits, openSheet, credits } = useCredits();
  const isCaller = !!call && call.caller_id === me;
  // The one waiting for the other to pick up.
  const isDialer = !!call && dialerOf(call) === me;

  // Minutes left on this call (the caller's minutes when it started).
  const remaining =
    agora.secondsLeft == null ? null : agora.secondsLeft - (agora.connectedAt ? (now - agora.connectedAt) / 1000 : 0);

  // Out of minutes: end the call (the server-issued token expires at the same time).
  useEffect(() => {
    // Ending the call is a one-off reaction to the clock reaching zero.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (phase === 'live' && agora.state === 'connected' && remaining != null && remaining <= 0) finish();
  }, [agora.state, finish, phase, remaining]);

  // Show the updated balance after the call.
  useEffect(() => {
    if (phase === 'after') refreshCredits();
  }, [phase, refreshCredits]);

  // React to the other person declining, missing or ending the call.
  useEffect(() => {
    if (!call || phase !== 'live') return;
    if (call.status === 'declined' || call.status === 'missed') {
      Alert.alert(call.status === 'declined' ? 'Call declined' : 'No answer', `${other?.username ?? name ?? 'They'} couldn’t talk right now.`);
      router.back();
    }
  }, [call, phase, other, name]);

  // Stop ringing after a while if nobody answers.
  useEffect(() => {
    if (!call || call.status !== 'ringing' || dialerOf(call) !== me) return;
    const left = RING_TIMEOUT_MS - (Date.now() - new Date(call.created_at).getTime());
    const t = setTimeout(() => setCallStatus(call.id, 'missed').catch(() => {}), Math.max(0, left));
    return () => clearTimeout(t);
  }, [call, me]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const hangUp = async () => {
    if (!call) return router.back();
    if (call.status === 'ringing') {
      await setCallStatus(call.id, dialerOf(call) === me ? 'missed' : 'declined').catch(() => {});
      return router.back();
    }
    finish();
  };

  const displayName = other?.username ?? name ?? '';

  if (phase === 'after') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.callBg, padding: 24, gap: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Avatar name={displayName} path={other?.avatar_path} size={96} />
          <T variant="title" style={{ textAlign: 'center' }}>Call ended</T>
          {agora.connectedAt ? <T muted>You talked for {clock((now - agora.connectedAt) / 1000)}</T> : null}
          {isCaller && credits ? (
            <Pressable accessibilityRole="button" onPress={() => openSheet()}>
              <T variant="small" style={{ color: colors.accentText }}>
                {Math.floor(credits.total_seconds / 60)} call minutes left · Get more
              </T>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 10, alignItems: 'center' }}>
          <T variant="label">How was the call?</T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} out of 5`}
                onPress={() => {
                  setRating(n);
                  if (call) rateCall(call, n).catch(() => {});
                }}
                style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 32, color: n <= rating ? '#F59E0B' : colors.border2 }}>★</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <T variant="label" style={{ textAlign: 'center' }}>Stay in touch with {displayName}?</T>
          <Button
            title="Yes, save to Inbox"
            onPress={async () => {
              if (!other) return;
              try {
                const conv = await activateConversationWith(other.id);
                router.replace({ pathname: '/chat/[id]', params: { id: conv.id } });
              } catch (e) {
                Alert.alert('Could not save', e instanceof Error ? e.message : '');
              }
            }}
          />
          <Button kind="secondary" title="No thanks" onPress={() => router.replace('/(tabs)')} />
          <Button
            kind="ghost"
            title="Report this call"
            onPress={() =>
              other &&
              report({ userId: other.id, callId: call?.id }, 'Reported after a call')
                .then(() => Alert.alert('Thanks', 'Our team will review this call.'))
                .catch(() => {})
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  const status =
    agora.error ??
    (call?.status === 'ringing'
      ? isDialer
        ? 'Ringing…'
        : 'Connecting…'
      : agora.state === 'connected' && agora.connectedAt
        ? clock((now - agora.connectedAt) / 1000)
        : 'Connecting…');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.callBg, paddingHorizontal: 24, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            other &&
            report({ userId: other.id, callId: call?.id }, 'Reported during a call')
              .then(() => Alert.alert('Reported', 'Thanks. You can end the call at any time.'))
              .catch(() => {})
          }
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border2, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="flag" size={16} color={colors.muted} />
          <T variant="small" muted>Report</T>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ width: 168, height: 168, borderRadius: 84, borderWidth: 3, borderColor: colors.accentText, padding: 8 }}>
          <Avatar name={displayName} path={other?.avatar_path} size={146} />
        </View>
        <T variant="title">{displayName}</T>
        {other?.languages.length ? <T muted>Speaks {other.languages.join(', ')}</T> : null}
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] }}>{status}</Text>
        {remaining != null && agora.state === 'connected' && remaining <= 120 ? (
          <View accessibilityLiveRegion="polite" style={{ alignSelf: 'stretch', padding: 12, borderRadius: 14, backgroundColor: colors.warnBg }}>
            <T variant="small" style={{ color: colors.warnFg, textAlign: 'center' }}>
              {isCaller
                ? `${clock(remaining)} of call time left. Watch an ad after the call to get more minutes.`
                : `This call can last ${clock(remaining)} more.`}
            </T>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Shows another conversation starter"
          onPress={() => setPrompt((p) => (p + 1) % PROMPTS.length)}
          style={{ alignSelf: 'stretch', padding: 16, borderRadius: 18, backgroundColor: colors.callPanel, borderWidth: 1, borderColor: colors.border, gap: 6 }}
        >
          <T variant="caps" muted>Stuck? Try asking</T>
          <T style={{ fontSize: 16 }}>{PROMPTS[prompt]}</T>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <CallButton label={agora.muted ? 'Unmute' : 'Mute'} icon={agora.muted ? 'micOff' : 'mic'} on={agora.muted} onPress={agora.toggleMute} />
        <CallButton label="Speaker" icon="speaker" on={agora.speaker} onPress={agora.toggleSpeaker} />
        <CallButton label="End" icon="hangup" danger onPress={hangUp} />
      </View>
    </SafeAreaView>
  );
}

function CallButton({ label, icon, onPress, on, danger }: { label: string; icon: IconName; onPress: () => void; on?: boolean; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!on }}
        onPress={onPress}
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: danger ? colors.danger : on ? colors.text : colors.callPanel,
          borderWidth: danger || on ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Icon name={icon} size={26} color={danger ? '#FFFFFF' : on ? colors.bg : colors.text} />
      </Pressable>
      <T variant="small" muted>{label}</T>
    </View>
  );
}
