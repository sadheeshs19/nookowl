import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

/** The owl peeking out of a little woven nest. */
export function NestIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M15.5 9.5l1.6-5.5 4 4.6zM32.5 9.5l-1.6-5.5-4 4.6z" fill="#7C2D12" />
      <Ellipse cx={24} cy={17.5} rx={11} ry={11} fill="#9A3412" />
      <Ellipse cx={24} cy={21} rx={7} ry={6} fill="#FDEBE2" />
      <Circle cx={19.6} cy={15} r={4.3} fill="#FFF7ED" />
      <Circle cx={28.4} cy={15} r={4.3} fill="#FFF7ED" />
      <Circle cx={19.9} cy={15.3} r={2.3} fill="#1F1308" />
      <Circle cx={28.1} cy={15.3} r={2.3} fill="#1F1308" />
      <Circle cx={20.6} cy={14.5} r={0.8} fill="#FFFFFF" />
      <Circle cx={28.8} cy={14.5} r={0.8} fill="#FFFFFF" />
      <Path d="M22.4 18.5h3.2L24 21.3z" fill="#F59E0B" />
      <Path d="M4.5 24.5c0 8.5 8.8 14.5 19.5 14.5s19.5-6 19.5-14.5c-5 2.4-12 3.4-19.5 3.4S9.5 26.9 4.5 24.5z" fill="#C2410C" />
      <Path d="M3 24.2c6 3 13 4 21 4s15-1 21-4" fill="none" stroke="#9A3412" strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M2.5 22.5l5 3.2M45.5 22.5l-5 3.2M6 21.5l3.5 4.2M42 21.5l-3.5 4.2" stroke="#9A3412" strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M7 31c5 2.6 11 3.6 17 3.6S36 33.6 41 31" fill="none" stroke="#F4A27A" strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M11 36c4 1.6 8.5 2 13 2s9-.4 13-2" fill="none" stroke="#F4A27A" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 27.5l6.5 5.5M18 28.5l5 5.5M30 28.5l-5 5.5M39 27.5l-6.5 5.5M14 34l4 3M34 34l-4 3" stroke="#7C2D12" strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

/** "Nooks" with the nest, for the top of the home screen. */
export function NestLogo({ size = 34 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Nooks" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <NestIcon size={size} />
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.8, letterSpacing: -0.5, color: colors.text }}>Nooks</Text>
    </View>
  );
}
