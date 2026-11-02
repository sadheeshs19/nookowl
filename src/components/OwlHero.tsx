import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { NightSky } from './NightSky';
import { OwlBody } from './OwlSplash';

/** The owl on a branch under the moon, gently bobbing, in a rounded night-sky card. */
export function OwlHero({ height = 260 }: { height?: number }) {
  const [bob] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    // Every few seconds the owl tilts its head toward the moon and back.
    const b = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.spring(tilt, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 6 }),
        Animated.delay(1600),
        Animated.spring(tilt, { toValue: 0, useNativeDriver: true, speed: 6, bounciness: 6 }),
      ]),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [bob, tilt]);
  return (
    <View style={{ height, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <NightSky moon />
      <Animated.View
        style={{
          marginBottom: 6,
          transform: [
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '9deg'] }) },
          ],
        }}
      >
        <OwlBody size={150} />
      </Animated.View>
      <View style={{ width: '70%', height: 8, borderRadius: 4, backgroundColor: '#3B2A22', marginBottom: 26 }} />
    </View>
  );
}
