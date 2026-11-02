import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// One shared pulse so every placeholder on screen breathes together.
const Pulse = createContext<Animated.Value | null>(null);

function PulseProvider({ children }: { children: ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Pulse.Provider value={v}>{children}</Pulse.Provider>;
}

/** A soft grey block that gently pulses while content loads. */
export function Bone({ w = '100%', h = 14, r = 7, style }: { w?: DimensionValue; h?: number; r?: number; style?: object }) {
  const { colors } = useTheme();
  const pulse = useContext(Pulse);
  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius: r, backgroundColor: colors.fill },
        pulse ? { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) } : null,
        style,
      ]}
    />
  );
}

/** Placeholder topic cards for the Topics feed. */
export function TopicSkeletons({ count = 3 }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <PulseProvider>
      <View style={{ gap: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ borderRadius: 20, padding: 16, gap: 12, backgroundColor: colors.card }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Bone w={40} h={40} r={20} />
              <View style={{ flex: 1, gap: 6 }}>
                <Bone w="40%" h={12} />
                <Bone w="25%" h={10} />
              </View>
            </View>
            <Bone w="92%" h={16} />
            <Bone w="70%" h={16} />
            <Bone w="100%" h={44} r={22} />
          </View>
        ))}
      </View>
    </PulseProvider>
  );
}

/** Placeholder rows for Inbox and Requests. */
export function RowSkeletons({ count = 5, inset = 20 }: { count?: number; inset?: number }) {
  return (
    <PulseProvider>
      <View style={{ paddingHorizontal: inset, gap: 18, paddingTop: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Bone w={48} h={48} r={24} />
            <View style={{ flex: 1, gap: 7 }}>
              <Bone w="45%" h={13} />
              <Bone w="80%" h={11} />
            </View>
          </View>
        ))}
      </View>
    </PulseProvider>
  );
}

/** Placeholder People card. */
export function PersonCardSkeleton() {
  const { colors } = useTheme();
  return (
    <PulseProvider>
      <View style={{ flex: 1, marginBottom: 14, borderRadius: 28, backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', gap: 12 }}>
        <Bone w="100%" h={130} r={0} />
        <View style={{ marginTop: -64, padding: 4, borderRadius: 60, backgroundColor: colors.card }}>
          <Bone w={104} h={104} r={52} />
        </View>
        <Bone w="40%" h={20} r={10} />
        <Bone w="55%" h={12} />
        <Bone w="75%" h={14} style={{ marginTop: 6 }} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <Bone w={70} h={28} r={14} />
          <Bone w={60} h={28} r={14} />
          <Bone w={80} h={28} r={14} />
        </View>
      </View>
    </PulseProvider>
  );
}
