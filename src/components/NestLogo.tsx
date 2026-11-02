import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

/** A little woven nest with two eggs. */
export function NestIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Ellipse cx={18.5} cy={22} rx={5.2} ry={6.4} fill="#9BD3E8" />
      <Ellipse cx={29} cy={21.5} rx={5.4} ry={6.8} fill="#B7E2F0" />
      <Ellipse cx={27.4} cy={18.8} rx={1.5} ry={1.1} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={20} cy={24} r={0.8} fill="#5FA8C4" />
      <Circle cx={31} cy={25} r={0.7} fill="#5FA8C4" />
      <Circle cx={16.5} cy={20} r={0.6} fill="#5FA8C4" />
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
