import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Text, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { fonts } from '../theme/colors';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { BANNER_H, BANNER_W, LibraryBanner } from './LibraryBanner';
import { NestIcon } from './NestLogo';
import { PressableScale } from './ui';

const INK = '#1C1A2E';
const SOFT = '#6B6880';
const ACCENT = '#C2410C';

// The pieces of the card, revealed one after another.
const PARTS = 6; // welcome, owl, title, privacy line, kindness, button

/**
 * A small white pop-up shown once, right after someone signs up:
 * a welcome over a little library, the owl in its nest, a privacy promise, and a note to be kind.
 * Everything drifts in slowly, and the owl gently bobs in its nest.
 */
export function PrivacyPromise({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {
  const [card] = useState(() => new Animated.Value(0));
  const [parts] = useState(() => Array.from({ length: PARTS }, () => new Animated.Value(0)));
  const [float] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    card.setValue(0);
    parts.forEach((p) => p.setValue(0));

    const slow = (v: Animated.Value, duration: number) =>
      Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });

    const intro = Animated.sequence([
      Animated.delay(200),
      slow(card, 700),
      Animated.stagger(260, parts.map((p) => slow(p, 900))),
    ]);

    const breathe = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const bob = breathe(float, 2400);
    const pulse = breathe(glow, 3200);

    intro.start();
    bob.start();
    pulse.start();
    return () => {
      intro.stop();
      bob.stop();
      pulse.stop();
    };
  }, [card, parts, float, glow, visible]);

  const rise = (i: number, distance = 14) => ({
    opacity: parts[i],
    transform: [{ translateY: parts[i].interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onContinue}>
      <View style={{ flex: 1, backgroundColor: 'rgba(12,10,28,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: '#FFFFFF',
            borderRadius: 30,
            paddingTop: 24,
            paddingHorizontal: 24,
            paddingBottom: 22,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 14 },
            elevation: 12,
            opacity: card,
            transform: [
              { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          }}
        >
          {/* A little library: bookshelves behind the owl, with the welcome on top. */}
          <Animated.View
            style={{
              alignSelf: 'stretch',
              marginTop: -24,
              marginHorizontal: -24,
              marginBottom: 18,
              aspectRatio: BANNER_W / BANNER_H,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              overflow: 'hidden',
            }}
          >
            <LibraryBanner />
            {/* Warm lamplight that slowly glows around the nest */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -40,
                alignItems: 'center',
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.8] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.06] }) }],
              }}
            >
              <Svg width={190} height={190}>
                <Defs>
                  <RadialGradient id="lamp" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#FFC98A" stopOpacity="0.85" />
                    <Stop offset="0.5" stopColor="#FFB067" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#FFB067" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx={95} cy={95} r={95} fill="url(#lamp)" />
              </Svg>
            </Animated.View>

            <Animated.Text
              style={[
                {
                  position: 'absolute',
                  top: 15,
                  alignSelf: 'center',
                  fontFamily: fonts.bodySemi,
                  fontSize: 13,
                  letterSpacing: 2.4,
                  color: '#FFFFFF',
                },
                rise(0, 8),
              ]}
            >
              WELCOME TO NOOKS
            </Animated.Text>

            <Animated.View
              style={{
                position: 'absolute',
                bottom: -6,
                alignSelf: 'center',
                opacity: parts[1],
                transform: [
                  { scale: parts[1].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                  { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [2, -4] }) },
                ],
              }}
            >
              <NestIcon size={96} />
            </Animated.View>
          </Animated.View>

          <Animated.Text
            accessibilityRole="header"
            style={[
              { fontFamily: fonts.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.4, color: INK, textAlign: 'center' },
              rise(2),
            ]}
          >
            {'Your privacy is\nsafe with us'}
          </Animated.Text>

          <Animated.View style={[{ alignItems: 'center' }, rise(3)]}>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: SOFT, textAlign: 'center', marginTop: 8 }}>
              We never show your email, never record your calls, and never sell your data.
            </Text>
          </Animated.View>

          <Animated.View style={[{ alignSelf: 'stretch', alignItems: 'center' }, rise(4)]}>
            <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: '#EFEDF5', marginVertical: 18 }} />
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: INK, textAlign: 'center' }}>Be kind</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: SOFT, textAlign: 'center', marginTop: 6 }}>
              Treat everyone here with respect. Every voice in Nooks deserves to feel welcome.
            </Text>
          </Animated.View>

          <Animated.View style={[{ alignSelf: 'stretch' }, rise(5)]}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="I understand, continue"
              onPress={() => {
                haptic.success();
                onContinue();
              }}
              style={{
                minHeight: 52,
                marginTop: 22,
                borderRadius: 999,
                backgroundColor: ACCENT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: '#FFFFFF' }}>I understand</Text>
            </PressableScale>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
