import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './icons';

/** iOS Settings-style grouped section: small caps header, rounded card of rows, grey footnote. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: 7 }}>
      {title ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 13, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.muted, marginLeft: 16 }}>
          {title}
        </Text>
      ) : null}
      <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: 0.5, backgroundColor: colors.border2, marginLeft: 58 }} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted, marginHorizontal: 16 }}>{footer}</Text> : null}
    </View>
  );
}

/** A coloured rounded-square icon, like the ones in iOS Settings. */
export function IconTile({ icon, color }: { icon: IconName; color: string }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color="#FFFFFF" />
    </View>
  );
}

/**
 * One row: icon tile, title (and optional subtitle), and something on the right
 * (a switch, a value, or a chevron when it opens something). `below` adds a control
 * under the title, such as chips or a segmented control.
 */
export function Row({
  icon,
  tint,
  title,
  subtitle,
  value,
  right,
  onPress,
  below,
  destructive,
}: {
  icon: IconName;
  tint: string;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  below?: ReactNode;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={{ paddingHorizontal: 14, paddingVertical: 11, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 30 }}>
        <IconTile icon={icon} color={tint} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: destructive ? colors.danger : colors.text }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: colors.muted }}>{subtitle}</Text> : null}
        </View>
        {value ? <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.muted }}>{value}</Text> : null}
        {right}
        {onPress && !right ? <Icon name="chevronRight" size={18} color={colors.muted} strokeWidth={2.4} /> : null}
      </View>
      {below ? <View style={{ marginLeft: 44 }}>{below}</View> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}

/** Colours for icon tiles (Apple's system palette). */
export const TILE = {
  orange: '#FF9500',
  blue: '#007AFF',
  green: '#34C759',
  purple: '#AF52DE',
  pink: '#FF2D55',
  indigo: '#5856D6',
  teal: '#30B0C7',
  grey: '#8E8E93',
  red: '#FF3B30',
};
