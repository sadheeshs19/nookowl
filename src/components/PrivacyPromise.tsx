import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, RadialGradient, Circle, Stop } from 'react-native-svg';
import { haptic } from '../lib/haptics';
import { fonts } from '../theme/colors';
import { Icon, type IconName } from './icons';
import { NestIcon } from './NestLogo';
import { NIGHT, NightSky } from './NightSky';
import { PressableScale } from './ui';

const PROMISES: { icon: IconName; tint: string; title: string; body: string }[] = [
  { icon: 'lock', tint: '#7C6CF2', title: 'Your email stays secret', body: 'People see your nickname, never your email.' },
  { icon: 'mic', tint: '#E8774A', title: 'Calls are never recorded', body: 'Your voice goes straight to them. Nothing is kept.' },
  { icon: 'phone', tint: '#34B37A', title: 'Nobody calls without your yes', body: 'A call starts only after you accept it.' },
  { icon: 'user', tint: '#3B9BE8', title: 'You decide what people see', body: 'Go private or hide your age any time.' },
  { icon: 'shield', tint: '#D9A43B', title: 'We never sell your data', body: 'Ads only use what you allow.' },
  { icon: 'trash', tint: '#E0567A', title: 'Leave any time', body: 'Delete your account and everything in it.' },
];

/** A soft glowing shield with the owl in its nest, gently breathing. */
function GuardianBadge() {
  const [breath] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const size = 124;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
        }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={NIGHT.glowA} stopOpacity="0.75" />
              <Stop offset="0.55" stopColor={NIGHT.glowA} stopOpacity="0.22" />
              <Stop offset="1" stopColor={NIGHT.glowA} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo)" />
        </Svg>
      </Animated.View>
      <Svg width={86} height={96} viewBox="0 0 104 116" style={{ position: 'absolute' }}>
        <Path
          d="M52 4l42 15v33c0 28-18 48-42 60C28 100 10 80 10 52V19z"
          fill="rgba(255,255,255,0.10)"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={{ marginTop: -4 }}>
        <NestIcon size={54} />
      </View>
    </View>
  );
}

function useEntrance(count: number) {
  const [values] = useState(() => Array.from({ length: count }, () => new Animated.Value(0)));
  useEffect(() => {
    Animated.stagger(
      90,
      values.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 6 })),
    ).start();
  }, [values]);
  return values.map((v) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  }));
}

/** Shown once, right after someone signs up and before they set up their profile. */
export function PrivacyPromise({ onContinue }: { onContinue: () => void }) {
  // 0: badge, 1: heading, 2..7: promises, 8: button
  const anim = useEntrance(PROMISES.length + 3);

  return (
    <View style={{ flex: 1, backgroundColor: NIGHT.top }}>
      <StatusBar style="light" />
      <NightSky moon={false} glow />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          <Animated.View style={[{ alignItems: 'center' }, anim[0]]}>
            <GuardianBadge />
          </Animated.View>

          <Animated.View style={[{ alignItems: 'center', gap: 6, marginTop: -8 }, anim[1]]}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, letterSpacing: 1.6, color: '#FDBA8C' }}>OUR PROMISE TO YOU</Text>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: NIGHT.text, textAlign: 'center' }}
            >
              Your nook is yours.
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: NIGHT.muted, textAlign: 'center', maxWidth: 320 }}>
              Real conversations start with feeling safe. Here’s how we look after you.
            </Text>
          </Animated.View>

          <View style={{ gap: 8 }}>
            {PROMISES.map((p, i) => (
              <Animated.View
                key={p.title}
                accessible
                accessibilityLabel={`${p.title}. ${p.body}`}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 13,
                    paddingVertical: 11,
                    paddingHorizontal: 13,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.10)',
                  },
                  anim[i + 2],
                ]}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: p.tint,
                  }}
                >
                  <Icon name={p.icon} size={19} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: NIGHT.text }}>{p.title}</Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18, color: NIGHT.muted }}>{p.body}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </ScrollView>

        <Animated.View style={[{ paddingHorizontal: 22, paddingBottom: 12, paddingTop: 6, gap: 12 }, anim[PROMISES.length + 2]]}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Sounds good, set up my profile"
            onPress={() => {
              haptic.success();
              onContinue();
            }}
            style={{
              minHeight: 56,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: NIGHT.glassOn,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: '#1B1440' }}>Sounds good</Text>
          </PressableScale>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
            hitSlop={8}
            style={{ alignSelf: 'center', paddingVertical: 4 }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: NIGHT.muted, textDecorationLine: 'underline' }}>
              Read the full Privacy Policy
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
