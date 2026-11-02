import { requireOptionalNativeModule } from 'expo';
import type { ComponentType } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/** Height of the floating tab island. */
export const ISLAND_HEIGHT = 64;
const GAP = 10;

/** The floating glass island is iPhone/iPad only; Android keeps the standard tab bar. */
export const USE_ISLAND = Platform.OS === 'ios';

/**
 * Bottom space a tab screen must leave so its content can scroll clear of the island.
 * On Android (standard tab bar) it's just the screen's normal padding.
 */
export function useTabBarSpace(normal = 0) {
  const insets = useSafeAreaInsets();
  return USE_ISLAND ? ISLAND_HEIGHT + GAP + Math.max(insets.bottom, GAP) + 8 : normal;
}

/** Style for the floating, rounded tab bar. */
export function useIslandStyle() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  if (!USE_ISLAND) return { backgroundColor: colors.bg, borderTopColor: colors.border };
  return {
    position: 'absolute' as const,
    left: 16,
    right: 16,
    bottom: Math.max(insets.bottom, GAP),
    height: ISLAND_HEIGHT,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: ISLAND_HEIGHT / 2,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
    overflow: 'hidden' as const,
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  };
}

// The blur needs a native part that older test builds of the app don't have.
// Without it we draw frosted glass instead.
let BlurView: ComponentType<ViewProps & { intensity?: number; tint?: string }> | null = null;
if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoBlur')) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    BlurView = require('expo-blur').BlurView;
  } catch {
    BlurView = null;
  }
}

/** The glass behind the tab icons. */
export function GlassBackground() {
  const { isDark } = useTheme();
  if (!USE_ISLAND) return null;
  if (BlurView) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={60}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(20,20,28,0.25)' : 'rgba(255,255,255,0.25)' }]} />
      </View>
    );
  }
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: isDark ? 'rgba(28,28,38,0.92)' : 'rgba(255,255,255,0.9)' },
      ]}
    />
  );
}
