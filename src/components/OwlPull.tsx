import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { OwlBody } from './OwlSplash';

/**
 * A little owl that appears as you pull a list down (iOS bounce), and bobs while
 * it refreshes. Use with a RefreshControl whose own spinner is hidden on iOS.
 */
export function OwlPull({ scrollY, refreshing, top = 0 }: { scrollY: Animated.Value; refreshing: boolean; top?: number }) {
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!refreshing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      bob.setValue(0);
    };
  }, [bob, refreshing]);

  if (Platform.OS !== 'ios') return null;
  const pull = scrollY.interpolate({ inputRange: [-90, -10], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: top + 6, alignSelf: 'center',
        opacity: refreshing ? 1 : pull,
        transform: [
          { scale: refreshing ? 1 : pull.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          { rotate: refreshing ? '0deg' : pull.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
        ],
      }}
    >
      <OwlBody size={46} />
    </Animated.View>
  );
}
