import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import {
  BEAK,
  GLYPH_K,
  GLYPH_N,
  GLYPH_OWL,
  GLYPH_S,
  LETTERS_VIEWBOX,
  LETTERS_VIEWBOX_X,
  TUFT_LEFT,
  TUFT_RIGHT,
  WORD_CENTER_X,
} from './brandPaths';
import { useTheme } from '../theme/ThemeProvider';

const STAGE = 240;
const SCALE = STAGE / 200;
/** At the start the word "nooks" is centred; the owl is centred at the end. */
const WORD_SHIFT = -(WORD_CENTER_X - 100) * SCALE;

function OwlEyes({ ink = '#16181D', pupils = true }: { ink?: string; pupils?: boolean }) {
  return (
    <>
      <Circle cx={82} cy={84} r={16} fill="#FFFFFF" stroke={ink} strokeWidth={5} />
      <Circle cx={118} cy={84} r={16} fill="#FFFFFF" stroke={ink} strokeWidth={5} />
      {pupils ? (
        <>
          <Circle cx={84} cy={86} r={6.5} fill="#16181D" />
          <Circle cx={120} cy={86} r={6.5} fill="#16181D" />
          <Circle cx={86} cy={83} r={2} fill="#FFFFFF" />
          <Circle cx={122} cy={83} r={2} fill="#FFFFFF" />
        </>
      ) : null}
    </>
  );
}

/** The owl in its nest, drawn on a 200x200 grid. Its eyes are the two "o"s of "nooks". */
export function OwlBody({ size = 200, withEyes = true }: { size?: number; withEyes?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* ear tufts */}
      <Path d="M60 66 L66 34 L86 58Z" fill="#9A3412" />
      <Path d="M140 66 L134 34 L114 58Z" fill="#9A3412" />
      {/* body */}
      <Ellipse cx={100} cy={104} rx={50} ry={54} fill="#C2410C" />
      <Ellipse cx={100} cy={124} rx={30} ry={30} fill="#FDEBE2" />
      <Path d="M88 118 q4 4 8 0 M104 118 q4 4 8 0 M94 130 q4 4 8 0 M84 132 q3 3 6 0 M110 132 q3 3 6 0" stroke="#E7B9A0" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* wings */}
      <Path d="M52 100 Q44 130 64 146 Q60 120 66 104Z" fill="#9A3412" />
      <Path d="M148 100 Q156 130 136 146 Q140 120 134 104Z" fill="#9A3412" />
      {withEyes ? <OwlEyes /> : null}
      {/* beak */}
      <Path d={BEAK} fill="#F59E0B" />
      {/* nest, drawn last so the owl sits inside it */}
      <Path d="M30 136 Q100 156 170 136 Q168 184 100 190 Q32 184 30 136Z" fill="#8B5A2B" />
      <Path d="M30 136 Q100 156 170 136" stroke="#A86B35" strokeWidth={7} fill="none" strokeLinecap="round" />
      <Path d="M38 156 Q100 176 162 156 M46 172 Q100 188 154 172" stroke="#6F4521" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path
        d="M24 132 L42 140 M176 132 L158 140 M52 146 L70 160 M148 146 L130 160 M84 150 L96 170 M116 150 L104 170"
        stroke="#6F4521"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Opening animation. The first frame matches the native splash image exactly
 * (assets/splash-icon.png): the "nooks" wordmark whose o's are the owl's eyes.
 * The eyes blink, the letters fade away, and the owl appears around the eyes
 * in its nest.
 */
export function OwlSplash({ onDone }: { onDone: () => void }) {
  const { isDark } = useTheme();
  const ink = isDark ? '#F3F4F6' : '#16181D';
  const accent = isDark ? '#FB923C' : '#C2410C';

  const letters = useSharedValue(1);
  const blink = useSharedValue(1);
  const shift = useSharedValue(WORD_SHIFT);
  const body = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.inOut(Easing.cubic);
    blink.value = withDelay(650, withSequence(withTiming(0.1, { duration: 110 }), withTiming(1, { duration: 150 })));
    letters.value = withDelay(1250, withTiming(0, { duration: 380 }));
    shift.value = withDelay(1250, withTiming(0, { duration: 600, easing: ease }));
    body.value = withDelay(1350, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    fade.value = withDelay(2600, withTiming(0, { duration: 350 }));
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [blink, body, fade, letters, onDone, shift]);

  const stageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));
  const lettersStyle = useAnimatedStyle(() => ({ opacity: letters.value }));
  const pupilStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: body.value,
    transform: [{ translateY: (1 - body.value) * 18 }, { scale: 0.92 + body.value * 0.08 }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      accessible
      accessibilityLabel="Nooks Owl"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: isDark ? '#121317' : '#FFF8F3' }, rootStyle]}
    >
      <Animated.View style={[{ width: STAGE, height: STAGE }, stageStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
          <OwlBody size={STAGE} withEyes={false} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: LETTERS_VIEWBOX_X * SCALE, width: 280 * SCALE, height: STAGE }, lettersStyle]}
        >
          <Svg width={280 * SCALE} height={STAGE} viewBox={LETTERS_VIEWBOX}>
            <Path d={TUFT_LEFT} fill={accent} />
            <Path d={TUFT_RIGHT} fill={accent} />
            <Path d={GLYPH_N} fill={ink} />
            <Path d={GLYPH_K} fill={ink} />
            <Path d={GLYPH_S} fill={ink} />
            <Path d={BEAK} fill="#F59E0B" />
            <Path d={GLYPH_OWL} fill={accent} />
          </Svg>
        </Animated.View>

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={STAGE} height={STAGE} viewBox="0 0 200 200">
            <OwlEyes ink={ink} pupils={false} />
          </Svg>
        </View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pupils, pupilStyle]} pointerEvents="none">
          <Svg width={STAGE} height={STAGE} viewBox="0 0 200 200">
            <Circle cx={84} cy={86} r={6.5} fill="#16181D" />
            <Circle cx={120} cy={86} r={6.5} fill="#16181D" />
            <Circle cx={86} cy={83} r={2} fill="#FFFFFF" />
            <Circle cx={122} cy={83} r={2} fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  // Blink around the eyes' height, not the middle of the stage.
  pupils: { transformOrigin: ['50%', `${(85 / 200) * 100}%`, 0] },
});
