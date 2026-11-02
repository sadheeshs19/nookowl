import { useState } from 'react';
import { Animated, View } from 'react-native';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

/**
 * iOS-style large titles: the big title scrolls away with the content and a small
 * centred title fades into a bar at the top. Pass `onScroll` to an Animated list.
 */
export function useCollapsingTitle() {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [onScroll] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
  );
  return { scrollY, onScroll };
}

/** The small title bar. Place it last inside the screen's SafeAreaView. */
export function CompactTitleBar({ title, scrollY, showAfter = 44 }: { title: string; scrollY: Animated.Value; showAfter?: number }) {
  const { colors, isDark } = useTheme();
  const opacity = scrollY.interpolate({ inputRange: [showAfter - 12, showAfter + 8], outputRange: [0, 1], extrapolate: 'clamp' });
  const lift = scrollY.interpolate({ inputRange: [showAfter - 12, showAfter + 8], outputRange: [6, 0], extrapolate: 'clamp' });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 44,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(11,11,16,0.96)' : 'rgba(242,242,247,0.96)',
        opacity,
      }}
    >
      <Animated.Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: colors.text, transform: [{ translateY: lift }] }}>{title}</Animated.Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0.5, backgroundColor: colors.border2 }} />
    </Animated.View>
  );
}
