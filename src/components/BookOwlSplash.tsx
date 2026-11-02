import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

/*
 * Opening animation: a cosy library. The bookcase appears, books pop onto the shelves,
 * book stacks drop in, a nest settles, and a nerdy owl in round glasses rises out of
 * it holding an open book. Its glasses glint, it blinks, and "Nooks" appears.
 * Everything is drawn on a 300x300 grid.
 */

const COLS = ['#C2410C', '#2F6FB0', '#3E8E5B', '#B83A5B', '#E0A43A', '#6B4FA0', '#2E7F86', '#D9653B', '#45506B'];

type Book = { x: number; y: number; w: number; h: number; c: string; tilt: boolean };

// A fixed, pseudo-random row of book spines so the shelves look the same every launch.
function shelfRow(baseY: number, x0: number, x1: number, seed: number): Book[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const out: Book[] = [];
  let x = x0;
  while (x < x1 - 6) {
    const w = pick([7, 8, 9, 10, 11, 12]);
    const h = pick([30, 34, 36, 38, 40, 42]);
    const c = pick(COLS);
    if (rand() < 0.08 && x + 16 < x1) {
      out.push({ x: x + 3, y: baseY, w, h, c, tilt: true });
      x += w + 7;
      continue;
    }
    out.push({ x, y: baseY, w, h, c, tilt: false });
    x += w + 1;
  }
  return out;
}
const ROW1 = shelfRow(70, 22, 278, 11);
const ROW2 = shelfRow(130, 22, 278, 29);

function Books({ books }: { books: Book[] }) {
  return (
    <>
      {books.map((b, i) =>
        b.tilt ? (
          <Rect key={i} x={b.x} y={b.y - b.h + 3} width={b.w} height={b.h} rx={1.5} fill={b.c} transform={`rotate(-14 ${b.x} ${b.y})`} />
        ) : (
          <Rect key={i} x={b.x} y={b.y - b.h} width={b.w} height={b.h} rx={1.5} fill={b.c} />
        ),
      )}
      {books
        .filter((b) => !b.tilt)
        .map((b, i) => (
          <Rect key={`l${i}`} x={b.x + 1.5} y={b.y - b.h + 6} width={b.w - 3} height={2} fill="#FFFFFF" opacity={0.35} />
        ))}
    </>
  );
}

function Layer({ size, style, children }: { size: number; style?: object; children: ReactNode }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 300 300">
        {children}
      </Svg>
    </Animated.View>
  );
}

const pop = (v: SharedValue<number>, delay: number) => {
  v.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 140 }));
};

export function BookOwlSplash({ onDone }: { onDone: () => void }) {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(320, width - 48);
  const u = size / 300; // one grid unit in points

  const caseIn = useSharedValue(0);
  const row1 = useSharedValue(0);
  const row2 = useSharedValue(0);
  const stackL = useSharedValue(0);
  const stackR = useSharedValue(0);
  const nest = useSharedValue(0);
  const owl = useSharedValue(0);
  const glint = useSharedValue(0);
  const blink = useSharedValue(1);
  const word = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    caseIn.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    pop(row1, 250);
    pop(row2, 420);
    pop(stackL, 620);
    pop(stackR, 740);
    nest.value = withDelay(700, withTiming(1, { duration: 320 }));
    owl.value = withDelay(950, withSpring(1, { damping: 9, stiffness: 120 }));
    glint.value = withDelay(1650, withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 420 })));
    blink.value = withDelay(2050, withSequence(withTiming(0.1, { duration: 100 }), withTiming(1, { duration: 140 })));
    word.value = withDelay(1500, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(3000, withTiming(0, { duration: 380 }));
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [blink, caseIn, fade, glint, nest, onDone, owl, row1, row2, stackL, stackR, word]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const caseStyle = useAnimatedStyle(() => ({ opacity: caseIn.value, transform: [{ scale: 0.94 + caseIn.value * 0.06 }] }));
  const row1Style = useAnimatedStyle(() => ({ opacity: Math.min(1, row1.value * 1.4), transform: [{ translateY: (1 - row1.value) * -14 * u }] }));
  const row2Style = useAnimatedStyle(() => ({ opacity: Math.min(1, row2.value * 1.4), transform: [{ translateY: (1 - row2.value) * -14 * u }] }));
  const stackLStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, stackL.value * 2), transform: [{ translateY: (1 - stackL.value) * -40 * u }] }));
  const stackRStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, stackR.value * 2), transform: [{ translateY: (1 - stackR.value) * -40 * u }] }));
  const nestStyle = useAnimatedStyle(() => ({ opacity: nest.value, transform: [{ scale: 0.9 + nest.value * 0.1 }] }));
  const owlStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - owl.value) * 110 * u }] }));
  const glintStyle = useAnimatedStyle(() => ({ opacity: glint.value }));
  const pupilStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 10 }] }));

  return (
    <Animated.View
      accessible
      accessibilityLabel="Nooks Owl"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: isDark ? '#0A0E1F' : '#FFF8F3' }, rootStyle]}
    >
      <View style={{ width: size, height: size }}>
        {/* bookcase */}
        <Layer size={size} style={caseStyle}>
          <Ellipse cx={150} cy={282} rx={130} ry={12} fill="#000000" opacity={isDark ? 0.3 : 0.08} />
          <Rect x={14} y={14} width={272} height={182} rx={10} fill="#7A4A26" />
          <Rect x={20} y={20} width={260} height={170} rx={6} fill="#26324F" />
          <Rect x={18} y={70} width={264} height={7} rx={2} fill="#8F5A2F" />
          <Rect x={18} y={130} width={264} height={7} rx={2} fill="#8F5A2F" />
          <Rect x={18} y={186} width={264} height={8} rx={2} fill="#8F5A2F" />
        </Layer>
        <Layer size={size} style={row1Style}>
          <Books books={ROW1} />
        </Layer>
        <Layer size={size} style={row2Style}>
          <Books books={ROW2} />
        </Layer>

        {/* book stacks */}
        <Layer size={size} style={stackLStyle}>
          <Rect x={22} y={262} width={58} height={13} rx={2} fill="#2F6FB0" />
          <Rect x={26} y={249} width={50} height={13} rx={2} fill="#E0A43A" />
          <Rect x={20} y={236} width={54} height={13} rx={2} fill="#B83A5B" />
          <Rect x={24} y={238} width={46} height={2} fill="#FFFFFF" opacity={0.4} />
          <Rect x={28} y={251} width={42} height={2} fill="#FFFFFF" opacity={0.4} />
          <Rect x={26} y={264} width={50} height={2} fill="#FFFFFF" opacity={0.4} />
        </Layer>
        <Layer size={size} style={stackRStyle}>
          <Rect x={222} y={262} width={58} height={13} rx={2} fill="#3E8E5B" />
          <Rect x={228} y={249} width={48} height={13} rx={2} fill="#6B4FA0" />
          <Rect x={226} y={264} width={50} height={2} fill="#FFFFFF" opacity={0.4} />
          <Rect x={232} y={251} width={40} height={2} fill="#FFFFFF" opacity={0.4} />
        </Layer>

        {/* the owl rises out of the nest: clipped at the nest's rim */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 262 * u, overflow: 'hidden' }} pointerEvents="none">
          <Animated.View style={[{ width: size, height: size }, owlStyle]}>
            <Svg width={size} height={size} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
              <Path d="M112 158 L118 128 L136 150Z M188 158 L182 128 L164 150Z" fill="#7C2D12" />
              <Ellipse cx={150} cy={190} rx={50} ry={52} fill="#9A3412" />
              <Ellipse cx={150} cy={212} rx={30} ry={30} fill="#FDEBE2" />
              <Path d="M138 205 q4 4 8 0 M154 205 q4 4 8 0 M145 218 q4 4 8 0" stroke="#E7B9A0" strokeWidth={2.4} fill="none" strokeLinecap="round" />
              <Circle cx={130} cy={180} r={15} fill="#FFF7ED" />
              <Circle cx={170} cy={180} r={15} fill="#FFF7ED" />
            </Svg>
            {/* pupils (they blink) */}
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: ['50%', '60.5%', 0] }, pupilStyle]}>
              <Svg width={size} height={size} viewBox="0 0 300 300">
                <Circle cx={132} cy={182} r={7} fill="#1F1308" />
                <Circle cx={168} cy={182} r={7} fill="#1F1308" />
                <Circle cx={134.5} cy={179} r={2.2} fill="#FFFFFF" />
                <Circle cx={170.5} cy={179} r={2.2} fill="#FFFFFF" />
              </Svg>
            </Animated.View>
            {/* glasses, beak and the open book */}
            <Svg width={size} height={size} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
              <Circle cx={130} cy={180} r={18} fill="#BFE3F5" fillOpacity={0.18} stroke="#1F2937" strokeWidth={4.5} />
              <Circle cx={170} cy={180} r={18} fill="#BFE3F5" fillOpacity={0.18} stroke="#1F2937" strokeWidth={4.5} />
              <Path d="M148 178 q2 -4 4 0" stroke="#1F2937" strokeWidth={4} fill="none" strokeLinecap="round" />
              <Path d="M112 176 l-10 -4 M188 176 l10 -4" stroke="#1F2937" strokeWidth={4} strokeLinecap="round" />
              <Path d="M120 170 l8 -6 M160 170 l8 -6" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
              <Path d="M145 196 h10 l-5 8z" fill="#F59E0B" />
              <Path d="M150 238 q-22 -8 -44 -2 v24 q22 -6 44 2z" fill="#FFFDF7" stroke="#C9B9A0" strokeWidth={1.5} />
              <Path d="M150 238 q22 -8 44 -2 v24 q-22 -6 -44 2z" fill="#FFFDF7" stroke="#C9B9A0" strokeWidth={1.5} />
              <Path d="M114 243 q14 -3 28 0 M114 249 q14 -3 28 0 M158 243 q14 -3 28 0 M158 249 q14 -3 28 0" stroke="#C9B9A0" strokeWidth={1.4} fill="none" />
              <Ellipse cx={108} cy={250} rx={9} ry={7} fill="#7C2D12" />
              <Ellipse cx={192} cy={250} rx={9} ry={7} fill="#7C2D12" />
            </Svg>
            {/* the glasses catch the light */}
            <Animated.View style={[StyleSheet.absoluteFill, glintStyle]}>
              <Svg width={size} height={size} viewBox="0 0 300 300">
                <Path d="M119 186 l20 -18 M124 190 l18 -16 M159 186 l20 -18 M164 190 l18 -16" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" opacity={0.9} />
                <Circle cx={124} cy={168} r={2.6} fill="#FFFFFF" />
                <Circle cx={164} cy={168} r={2.6} fill="#FFFFFF" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>

        {/* nest, in front of the owl */}
        <Layer size={size} style={nestStyle}>
          <Path d="M84 246 Q150 266 216 246 Q212 290 150 294 Q88 290 84 246Z" fill="#8B5A2B" />
          <Path d="M80 246 Q150 268 220 246" stroke="#A86B35" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Path d="M92 262 Q150 280 208 262 M100 276 Q150 290 200 276" stroke="#6F4521" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M76 242 L94 250 M224 242 L206 250 M104 256 L120 270 M196 256 L180 270 M136 260 L146 278 M164 260 L154 278" stroke="#6F4521" strokeWidth={3} strokeLinecap="round" />
        </Layer>
      </View>

      <Animated.View style={[{ alignItems: 'center', marginTop: 18, gap: 4 }, wordStyle]}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, letterSpacing: -0.8, color: isDark ? '#F3F4F6' : '#16181D' }}>Nooks</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: isDark ? '#A6ACC8' : '#5B6070' }}>Find your people. Talk about anything.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
