import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, Pressable, Text, View } from 'react-native';
import { getHootState, sendHoot } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { HootState } from '../lib/types';
import { useRealtime } from '../lib/useRealtime';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';

/**
 * A "free to talk?" nudge. Works like a Facebook poke: after you hoot,
 * you wait for them to hoot back before you can hoot again.
 */
export function HootButton({ otherId, otherName, onState }: { otherId: string; otherName: string; onState?: (s: HootState) => void }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const me = session?.user.id;
  const [state, setState] = useState<HootState | null>(null);
  const [busy, setBusy] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [scale] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));

  const refresh = useCallback(async () => {
    try {
      const s = await getHootState(otherId);
      setState(s);
      onState?.(s);
    } catch {
      // the button just stays as it was
    }
  }, [otherId, onState]);

  useEffect(() => {
    // Fetching on mount; state is only set after the network call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useRealtime(
    `hoots-${otherId}`,
    me
      ? [
          { table: 'hoots', event: 'INSERT', filter: `to_id=eq.${me}` },
          { table: 'hoots', event: 'INSERT', filter: `from_id=eq.${me}` },
        ]
      : [],
    refresh,
    !!me,
  );

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 1800);
    return () => clearTimeout(t);
  }, [bubble]);

  if (!state?.connected) return null;
  const waiting = !state.can_hoot;
  const theyHooted = state.can_hoot && state.last_from === otherId;

  const hoot = async () => {
    if (waiting) {
      setBubble(`Waiting for ${otherName} to hoot back`);
      return;
    }
    setBusy(true);
    try {
      const s = await sendHoot(otherId);
      setState(s);
      onState?.(s);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      lift.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 14 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
        ]),
        Animated.timing(lift, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start();
      setBubble(`Hoo-hoo! You hooted ${otherName}`);
    } catch (e) {
      Alert.alert('Couldn’t hoot', e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          waiting ? `Hoot sent. Waiting for ${otherName} to hoot back` : theyHooted ? `Hoot back at ${otherName}` : `Hoot at ${otherName}`
        }
        accessibilityState={{ busy, disabled: waiting }}
        onPress={hoot}
        disabled={busy}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theyHooted ? colors.accent : waiting ? 'transparent' : colors.surface,
          borderWidth: waiting ? 1 : 0,
          borderColor: colors.border2,
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name="owl" size={22} color={theyHooted ? colors.onAccent : waiting ? colors.muted : colors.accentText} />
        </Animated.View>
        {theyHooted ? (
          <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.bg }} />
        ) : null}
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 10,
          opacity: lift.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
        }}
      >
        <Icon name="owl" size={24} color={colors.accentText} />
      </Animated.View>
      {bubble ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', top: 50, right: -40, width: 200, padding: 10, borderRadius: 12, backgroundColor: colors.chipOnBg, zIndex: 10 }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.chipOnFg }}>{bubble}</Text>
        </View>
      ) : null}
    </View>
  );
}
