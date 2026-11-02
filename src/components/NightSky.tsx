import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Night colours used by the call screen and welcome screen (always dark). */
export const NIGHT = {
  top: '#070A1A',
  mid: '#111735',
  bottom: '#231A45',
  glowA: '#5B4BC4',
  glowB: '#C2410C',
  moon: '#F6EBD2',
  text: '#F5F3FF',
  muted: 'rgba(235,232,255,0.66)',
  glass: 'rgba(255,255,255,0.14)',
  glassOn: 'rgba(255,255,255,0.92)',
};

// Fixed star positions (0..1), so the sky looks the same every time.
function makeStars(n: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: n }, () => ({ x: rand(), y: rand() * 0.75, r: 0.5 + rand() * 1.3 }));
}
const LAYERS = [makeStars(26, 7), makeStars(22, 19), makeStars(18, 43)];

function useLoop(duration: number, delay = 0) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay]);
  return v;
}

/**
 * A deep-night background: gradient sky, twinkling stars, an optional moon,
 * and two soft glows that drift slowly (used behind calls).
 */
export function NightSky({ moon = false, glow = false }: { moon?: boolean; glow?: boolean }) {
  const { width, height } = useWindowDimensions();
  const t1 = useLoop(2600);
  const t2 = useLoop(3400, 900);
  const t3 = useLoop(3000, 1700);
  const drift = useLoop(9000);
  const twinkles = [t1, t2, t3];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={NIGHT.top} />
            <Stop offset="0.55" stopColor={NIGHT.mid} />
            <Stop offset="1" stopColor={NIGHT.bottom} />
          </LinearGradient>
          <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={NIGHT.moon} stopOpacity="0.35" />
            <Stop offset="1" stopColor={NIGHT.moon} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
        {moon ? (
          <>
            <Circle cx={width * 0.78} cy={height * 0.14} r={90} fill="url(#moonGlow)" />
            <Circle cx={width * 0.78} cy={height * 0.14} r={30} fill={NIGHT.moon} />
            <Circle cx={width * 0.78 + 9} cy={height * 0.14 - 5} r={5} fill="#E6D8B8" />
            <Circle cx={width * 0.78 - 10} cy={height * 0.14 + 9} r={3.5} fill="#E6D8B8" />
          </>
        ) : null}
      </Svg>

      {glow ? (
        <>
          <Glow color={NIGHT.glowA} size={width * 1.1} x={-width * 0.35} y={height * 0.12} drift={drift} dx={40} dy={30} />
          <Glow color={NIGHT.glowB} size={width * 0.9} x={width * 0.35} y={height * 0.55} drift={drift} dx={-35} dy={-25} />
        </>
      ) : null}

      {LAYERS.map((stars, i) => (
        <Animated.View
          key={i}
          style={[StyleSheet.absoluteFill, { opacity: twinkles[i].interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }) }]}
        >
          <Svg width={width} height={height}>
            {stars.map((s, j) => (
              <Circle key={j} cx={s.x * width} cy={s.y * height} r={s.r} fill="#FFFFFF" />
            ))}
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

function Glow({ color, size, x, y, drift, dx, dy }: { color: string; size: number; x: number; y: number; drift: Animated.Value; dx: number; dy: number }) {
  const gid = `glow${color.replace('#', '')}`;
  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size,
        transform: [
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        ],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}
