import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, PanResponder, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Button, Empty, T } from '../../components/ui';
import { getPeopleOpenToCalls, sendCallRequest, startCall } from '../../lib/api';
import { CreditsPill } from '../../components/CreditsSheet';
import { useAuth } from '../../lib/auth';
import { useCredits } from '../../lib/credits';
import { profileImageUrl } from '../../lib/images';
import type { Profile } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

const SWIPE_AT = 110;

export default function People() {
  const { colors } = useTheme();
  const { profile: me } = useAuth();
  const { credits, openSheet, ensureCanCall, refresh: refreshCredits } = useCredits();
  const [people, setPeople] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [x] = useState(() => new Animated.Value(0));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPeople(await getPeopleOpenToCalls());
      setIndex(0);
    } catch (e) {
      Alert.alert('Could not load people', e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const current = people[index];
  const next = people[index + 1];

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const advance = useCallback(
    (dir: 1 | -1) => {
      const person = people[index];
      Animated.timing(x, { toValue: dir * 520, duration: 220, useNativeDriver: true }).start(() => {
        x.setValue(0);
        setIndex((i) => i + 1);
      });
      if (dir === 1 && person) {
        if (credits && credits.total_seconds < 60) {
          openSheet('You need at least a minute of call time to send a call request. Watch a short ad to get more.');
          return;
        }
        sendCallRequest(person.id)
          .then(() => showToast(`Call request sent to ${person.username}. We’ll ring you if they accept.`))
          .catch((e) => showToast(e instanceof Error ? e.message : 'Could not send the request.'));
      }
    },
    [credits, index, openSheet, people, x],
  );

  // The gesture handler is created once; it calls the latest `advance` through a ref.
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  // The ref is only read inside gesture callbacks, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_AT) advanceRef.current(1);
        else if (g.dx < -SWIPE_AT) advanceRef.current(-1);
        else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  const callNow = async () => {
    if (!current) return;
    if (!(await ensureCanCall())) return;
    try {
      const call = await startCall(current.id);
      refreshCredits();
      router.push({ pathname: '/call/[id]', params: { id: call.id, name: current.username } });
    } catch (e) {
      Alert.alert('Could not start the call', e instanceof Error ? e.message : '');
    }
  };

  const rotate = x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-16deg', '0deg', '16deg'] });
  const reqOpacity = x.interpolate({ inputRange: [0, SWIPE_AT], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = x.interpolate({ inputRange: [-SWIPE_AT, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title">Ready to talk</T>
          <T muted>Swipe right to send a call request</T>
        </View>
        <CreditsPill seconds={credits?.total_seconds} onPress={() => openSheet()} />
      </View>

      {!me?.open_to_calls ? (
        <View style={{ marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 14, backgroundColor: colors.noticeBg }}>
          <T variant="small" style={{ color: colors.noticeFg }}>
            You’re hidden from this list. Turn on “Open to calls” in Profile so people can find you too.
          </T>
        </View>
      ) : null}

      <View style={{ flex: 1, marginHorizontal: 20 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
        ) : !current ? (
          <Empty
            title="That’s everyone for now"
            body="New people turn on calls all the time. Check back soon, or post a topic."
            action={<Button title="Refresh" kind="secondary" onPress={load} />}
          />
        ) : (
          <>
            {next ? (
              <View
                style={{
                  position: 'absolute', left: 12, right: 12, top: 14, bottom: 0,
                  borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
                  opacity: 0.7, alignItems: 'center', paddingTop: 40,
                }}
              >
                <Avatar name={next.username} path={next.avatar_path} size={88} />
              </View>
            ) : null}
            <Animated.View
              {...pan.panHandlers}
              accessible
              accessibilityLabel={`Profile of ${current.username}`}
              accessibilityActions={[{ name: 'activate', label: 'Send call request' }]}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 14,
                borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
                padding: 22, paddingTop: 0, alignItems: 'center', gap: 12, overflow: 'hidden',
                transform: [{ translateX: x }, { rotate }],
              }}
            >
              <Animated.Text style={[stamp, { left: 20, color: colors.online, borderColor: colors.online, opacity: reqOpacity, transform: [{ rotate: '-12deg' }] }]}>
                REQUEST
              </Animated.Text>
              <Animated.Text style={[stamp, { right: 20, color: colors.muted, borderColor: colors.muted, opacity: passOpacity, transform: [{ rotate: '12deg' }] }]}>
                PASS
              </Animated.Text>
              <View style={{ alignSelf: 'stretch', marginHorizontal: -22, height: 130, backgroundColor: colors.surface }}>
                {current.cover_path ? (
                  <Image source={{ uri: profileImageUrl(current.cover_path)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : null}
              </View>
              <View style={{ marginTop: -64, padding: 4, borderRadius: 60, backgroundColor: colors.card }}>
                <Avatar name={current.username} path={current.avatar_path} size={104} />
              </View>
              <T variant="heading">{current.username}</T>
              <T variant="small" muted>{[current.city, 'open for calls'].filter(Boolean).join(' · ')}</T>
              {current.bio ? <T style={{ textAlign: 'center' }}>{current.bio}</T> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {[...current.languages, ...current.interests].slice(0, 6).map((tag) => (
                  <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface }}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text }}>{tag}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </>
        )}

        {toast ? (
          <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 0, right: 0, top: 8, padding: 12, borderRadius: 14, backgroundColor: colors.chipOnBg }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.chipOnFg }}>{toast}</Text>
          </View>
        ) : null}
      </View>

      {current ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 28, paddingVertical: 14 }}>
          <RoundButton label="Pass" icon="close" onPress={() => advance(-1)} />
          <RoundButton label="Call now" icon="phone" big onPress={callNow} />
          <RoundButton label="Request" icon="send" onPress={() => advance(1)} tint={colors.online} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const stamp = {
  position: 'absolute' as const,
  top: 22,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 2.5,
  borderRadius: 8,
  fontFamily: fonts.bodyBold,
  fontSize: 15,
  letterSpacing: 1,
  zIndex: 2,
};

function RoundButton({ label, icon, onPress, big, tint }: { label: string; icon: 'close' | 'phone' | 'send'; onPress: () => void; big?: boolean; tint?: string }) {
  const { colors } = useTheme();
  const size = big ? 72 : 60;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{
          width: size, height: size, borderRadius: size / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: big ? colors.accent : colors.card,
          borderWidth: big ? 0 : 1, borderColor: colors.border2,
        }}
      >
        <Icon name={icon} size={big ? 28 : 24} color={big ? colors.onAccent : tint ?? colors.text} />
      </Pressable>
      <T variant="small" muted>{label}</T>
    </View>
  );
}
