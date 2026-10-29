import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
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
}: {
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
  const fg = kind === 'primary' || kind === 'danger' ? colors.onAccent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: colors.border2,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {title ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: fg }}>{title}</Text> : null}
    </Pressable>
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
            borderWidth: 1,
            borderColor: colors.border2,
            backgroundColor: colors.surface,
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: selected ? colors.chipOnBg : colors.border2,
        backgroundColor: selected ? colors.chipOnBg : 'transparent',
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: selected ? colors.chipOnFg : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 12, backgroundColor: colors.card },
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
      style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.surface }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.card : 'transparent',
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
