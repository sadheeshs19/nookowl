import { useEffect, useState } from 'react';
import { Animated, Modal, Text, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { fonts } from '../theme/colors';
import { NestIcon } from './NestLogo';
import { PressableScale } from './ui';

const INK = '#1C1A2E';
const SOFT = '#6B6880';
const ACCENT = '#C2410C';

/**
 * A small white pop-up shown once, right after someone signs up:
 * the owl in its nest, a privacy promise, and a gentle ask to be kind.
 */
export function PrivacyPromise({ visible, onContinue }: { visible: boolean; onContinue: () => void }) {
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    Animated.sequence([
      Animated.delay(150),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 11, bounciness: 9 }),
    ]).start();
  }, [pop, visible]);

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
            paddingTop: 26,
            paddingHorizontal: 24,
            paddingBottom: 22,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 14 },
            elevation: 12,
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
          }}
        >
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              backgroundColor: '#FFF4EC',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <NestIcon size={86} />
          </View>

          <Text
            accessibilityRole="header"
            style={{ fontFamily: fonts.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.4, color: INK, textAlign: 'center' }}
          >
            {'Your privacy is\nsafe with us'}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: SOFT, textAlign: 'center', marginTop: 8 }}>
            We never show your email, never record your calls, and never sell your data.
          </Text>

          <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: '#EFEDF5', marginVertical: 18 }} />

          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: INK, textAlign: 'center' }}>Please be kind</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: SOFT, textAlign: 'center', marginTop: 6 }}>
            Treat everyone here with respect. Every voice in Nooks deserves to feel welcome.
          </Text>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="I promise, continue"
            onPress={() => {
              haptic.success();
              onContinue();
            }}
            style={{
              alignSelf: 'stretch',
              minHeight: 52,
              marginTop: 22,
              borderRadius: 999,
              backgroundColor: ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: '#FFFFFF' }}>I promise</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}
