import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  type PressableProps,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { initial } from '../lib/format';
import { profileImageUrl } from '../lib/images';
import { haptic } from '../lib/haptics';

const OUTER_KEYS = new Set([
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
]);

/**
 * A Pressable that gently shrinks while pressed and springs back, like iOS controls.
 * `feedback` adds a haptic on press ('tap' for buttons, 'select' for choices).
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  feedback,
  onPress,
  disabled,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'tap' | 'select' | 'swipe' | 'success';
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 8 : 0 }).start();
  // Layout that positions the control (flex, margins, width…) belongs on the outer
  // Pressable; the look (colours, padding, radius) goes on the part that scales.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const outer: ViewStyle = {};
  const inner: ViewStyle = {};
  for (const [k, v] of Object.entries(flat)) {
    if (OUTER_KEYS.has(k)) (outer as Record<string, unknown>)[k] = v;
    else (inner as Record<string, unknown>)[k] = v;
  }
  if (outer.flex !== undefined || outer.width !== undefined || outer.alignSelf === 'stretch') (inner as Record<string, unknown>).flexGrow = 1;
  return (
    <Pressable
      {...rest}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => {
        to(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback) haptic[feedback]();
        onPress?.(e);
      }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** iOS-style switch in the app's accent colour, with a selection haptic. */
export function Toggle({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Switch
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={(v) => {
        haptic.select();
        onValueChange(v);
      }}
      trackColor={{ true: colors.accent, false: colors.toggleOff }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.toggleOff}
    />
  );
}

export function T({
  children,
  style,
  variant = 'body',
  muted,
  numberOfLines,
  selectable,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: 'title' | 'heading' | 'topic' | 'body' | 'label' | 'small' | 'caps';
  muted?: boolean;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  const v = variants[variant];
  return (
    <Text numberOfLines={numberOfLines} selectable={selectable} style={[v, { color: muted ? colors.muted : colors.text }, style]}>
      {children}
    </Text>
  );
}

const variants = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  topic: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 25 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  caps: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
});

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  accessibilityLabel,
  color,
}: {
  /** Text colour override (e.g. white on the night call screen). */
  color?: string;
  title?: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg =
    kind === 'primary' ? colors.accent : kind === 'danger' ? colors.danger : 'transparent';
  const fg = color ?? (kind === 'primary' || kind === 'danger' ? colors.onAccent : colors.text);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      feedback="tap"
      disabled={disabled || loading}
      style={[
        {
          minHeight: 50,
          borderRadius: 25,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: kind === 'secondary' ? colors.fill : bg,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {title ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: fg }}>{title}</Text> : null}
    </PressableScale>
  );
}

export function Avatar({ name, path, size = 40 }: { name: string | null | undefined; path?: string | null; size?: number }) {
  const { colors } = useTheme();
  const uri = profileImageUrl(path);
  if (uri) {
    return (
      <Image
        accessible={false}
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.avatarBg }}
      />
    );
  }
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.avatarBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.4, color: colors.avatarFg }}>{initial(name)}</Text>
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 48,
            borderRadius: 14,
            borderWidth: 0,
            backgroundColor: colors.card,
            paddingHorizontal: 14,
            fontFamily: fonts.body,
            fontSize: 16,
            color: colors.text,
          },
          props.style,
        ]}
      />
      {hint ? <T variant="small" muted>{hint}</T> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      feedback="select"
      scaleTo={0.94}
      style={{
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: selected ? colors.accent : colors.fill,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: selected ? colors.onAccent : colors.text }}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { borderRadius: 20, padding: 16, gap: 12, backgroundColor: colors.card },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 }}>
      <T variant="heading" style={{ textAlign: 'center' }}>{title}</T>
      {body ? <T muted style={{ textAlign: 'center' }}>{body}</T> : null}
      {action}
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 13, backgroundColor: colors.fill }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.key);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.segmentOn : 'transparent',
              shadowColor: '#000',
              shadowOpacity: on ? 0.12 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: on ? 1 : 0,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: on ? colors.text : colors.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
